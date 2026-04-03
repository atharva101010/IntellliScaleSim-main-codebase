import asyncio
import json
import logging
import os
import shutil
import subprocess
import time
from typing import Any, Optional

import docker
from docker.errors import DockerException, NotFound

logger = logging.getLogger(__name__)


class DockerCLIUnavailableError(RuntimeError):
    """Raised when Docker CLI is not installed or not on PATH."""


class DockerService:
    """Docker service with SDK-first execution and CLI fallback."""

    def __init__(self):
        self.docker_command = "docker"
        self._client = None

    def _get_client(self):
        """Get or create Docker SDK client with Windows support and timeout handling."""
        if self._client is None:
            try:
                # Try to create client with increased timeout for Windows
                self._client = docker.from_env(timeout=10)
                # Test the connection
                self._client.ping()
            except Exception as e:
                logger.warning(f"Failed to connect via docker.from_env(): {e}")
                # Fallback: try explicit Windows named pipe
                try:
                    self._client = docker.DockerClient(base_url='npipe:////./pipe/docker_engine', timeout=10)
                    self._client.ping()
                    logger.info("Connected to Docker via Windows named pipe")
                except Exception as e2:
                    logger.error(f"Failed to connect via named pipe: {e2}")
                    raise DockerException(
                        f"Docker engine is not reachable. Please ensure Docker Desktop is running. "
                        f"Errors: {str(e)}, {str(e2)}"
                    )
        return self._client

    def _run_command(self, args: list[str], capture_output: bool = True) -> subprocess.CompletedProcess:
        """Run a docker command via subprocess (fallback path)."""
        cmd = [self.docker_command] + args
        try:
            result = subprocess.run(
                cmd,
                capture_output=capture_output,
                text=True,
                check=True,
            )
            return result
        except subprocess.CalledProcessError as e:
            logger.error(f"Docker command failed: {' '.join(cmd)}")
            logger.error(f"Error: {e.stderr}")
            raise
        except FileNotFoundError as e:
            raise DockerCLIUnavailableError(
                "Docker CLI not found. Please ensure Docker Desktop is installed and in PATH."
            ) from e

    @staticmethod
    def _empty_stats() -> dict:
        return {
            "cpu_percent": 0,
            "memory_usage_mb": 0,
            "memory_limit_mb": 0,
            "memory_percent": 0,
            "network_rx_bytes": 0,
            "network_tx_bytes": 0,
            "network_rx_mb": 0,
            "network_tx_mb": 0,
        }

    def _parse_sdk_stats(self, stats: dict) -> dict:
        """Normalize Docker SDK stats payload to service output shape."""
        cpu_stats = stats.get("cpu_stats", {})
        precpu_stats = stats.get("precpu_stats", {})

        cpu_usage = cpu_stats.get("cpu_usage", {})
        precpu_usage = precpu_stats.get("cpu_usage", {})

        cpu_delta = cpu_usage.get("total_usage", 0) - precpu_usage.get("total_usage", 0)
        system_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get("system_cpu_usage", 0)
        online_cpus = cpu_stats.get("online_cpus")
        if not online_cpus:
            percpu = cpu_usage.get("percpu_usage") or []
            online_cpus = len(percpu) if percpu else 1

        cpu_percent = 0.0
        if system_delta > 0 and cpu_delta > 0:
            cpu_percent = (cpu_delta / system_delta) * online_cpus * 100.0

        memory_stats = stats.get("memory_stats", {})
        memory_usage_bytes = float(memory_stats.get("usage", 0) or 0)
        memory_limit_bytes = float(memory_stats.get("limit", 0) or 0)
        memory_usage_mb = memory_usage_bytes / (1024.0 * 1024.0)
        memory_limit_mb = memory_limit_bytes / (1024.0 * 1024.0)
        memory_percent = (memory_usage_bytes / memory_limit_bytes * 100.0) if memory_limit_bytes > 0 else 0.0

        network_rx = 0
        network_tx = 0
        for network in (stats.get("networks") or {}).values():
            network_rx += int(network.get("rx_bytes", 0) or 0)
            network_tx += int(network.get("tx_bytes", 0) or 0)

        network_rx_mb = network_rx / (1024.0 * 1024.0)
        network_tx_mb = network_tx / (1024.0 * 1024.0)

        return {
            "cpu_percent": round(cpu_percent, 2),
            "memory_usage_mb": round(memory_usage_mb, 2),
            "memory_limit_mb": round(memory_limit_mb, 2),
            "memory_percent": round(memory_percent, 2),
            "network_rx_bytes": network_rx,
            "network_tx_bytes": network_tx,
            "network_rx_mb": round(network_rx_mb, 2),
            "network_tx_mb": round(network_tx_mb, 2),
        }

    def get_docker_status(self) -> dict:
        """Get detailed Docker status information."""
        status = {
            "available": False,
            "cli_installed": shutil.which(self.docker_command) is not None,
            "engine_running": False,
            "version": None,
            "error": None,
            "message": None,
        }

        sdk_error_text = None

        # Prefer Docker SDK so backend container can operate via mounted docker.sock.
        try:
            client = self._get_client()
            client.ping()
            version_info = client.version() or {}
            status["engine_running"] = True
            status["available"] = True
            status["version"] = version_info.get("Version")
            if status["version"]:
                status["message"] = f"Docker is available (engine version {status['version']})"
            else:
                status["message"] = "Docker engine is available"
            return status
        except Exception as e:
            sdk_error_text = str(e)
            logger.warning(f"Docker SDK connection failed: {e}")

        # Fallback to CLI checks if SDK is not available.
        if status["cli_installed"]:
            try:
                result = self._run_command(["version", "--format", "{{.Client.Version}}"], capture_output=True)
                status["version"] = result.stdout.strip() or None
                status["engine_running"] = True
                status["available"] = True
                status["message"] = (
                    f"Docker is available (version {status['version']})"
                    if status["version"]
                    else "Docker is available"
                )
                return status
            except subprocess.CalledProcessError as e:
                error_msg = (e.stderr or "").lower()
                if "cannot connect" in error_msg or "npipe" in error_msg or "pipe" in error_msg:
                    status["error"] = "docker_desktop_not_running"
                    status["message"] = "Docker Desktop is not running. Please start Docker Desktop and try again."
                elif "daemon" in error_msg:
                    status["error"] = "docker_daemon_not_running"
                    status["message"] = "Docker daemon is not running. Please start Docker Desktop."
                else:
                    status["error"] = "docker_connection_failed"
                    status["message"] = f"Failed to connect to Docker: {e.stderr}"
                logger.warning(f"Docker CLI check failed: {e.stderr}")
                return status
            except DockerCLIUnavailableError:
                status["cli_installed"] = False

        if sdk_error_text:
            status["error"] = "docker_connection_failed"
            status["message"] = f"Docker engine is not reachable: {sdk_error_text}"
        else:
            status["error"] = "docker_not_installed"
            status["message"] = "Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"

        return status

    @property
    def available(self) -> bool:
        """Check if Docker is available."""
        return self.get_docker_status()["available"]

    def pull_image(self, image_name: str, username: Optional[str] = None, password: Optional[str] = None):
        """Pull a Docker image from Docker Hub."""
        try:
            client = self._get_client()
            auth_config = {"username": username, "password": password} if username and password else None
            client.images.pull(image_name, auth_config=auth_config)
            logger.info(f"Successfully pulled image using Docker SDK: {image_name}")
            return
        except Exception as sdk_err:
            logger.warning(f"Docker SDK pull failed, falling back to CLI: {sdk_err}")

        if username and password:
            try:
                subprocess.run(
                    [self.docker_command, "login", "-u", username, "--password-stdin"],
                    input=password,
                    capture_output=True,
                    text=True,
                    check=True,
                )
                logger.info(f"Docker login successful for user: {username}")
            except subprocess.CalledProcessError as e:
                raise Exception(f"Docker login failed: {e.stderr}") from e

        try:
            self._run_command(["pull", image_name], capture_output=True)
            logger.info(f"Successfully pulled image: {image_name}")
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to pull image {image_name}: {e.stderr}") from e

    def list_local_images(self) -> list[str]:
        """List all Docker images available locally."""
        try:
            client = self._get_client()
            tags = []
            for image in client.images.list():
                tags.extend(image.tags or [])
            unique_tags = sorted({tag for tag in tags if tag and tag != "<none>:<none>"})
            return unique_tags
        except Exception as sdk_err:
            logger.warning(f"Docker SDK image list failed, falling back to CLI: {sdk_err}")

        try:
            result = self._run_command(["images", "--format", "{{.Repository}}:{{.Tag}}"], capture_output=True)
            images = result.stdout.strip().split("\n")
            return [img for img in images if img and img != "<none>:<none>"]
        except Exception as e:
            logger.error(f"Failed to list Docker images: {e}")
            return []

    def image_exists_locally(self, image_name: str) -> bool:
        """Check if a Docker image exists locally."""
        try:
            client = self._get_client()
            client.images.get(image_name)
            logger.info(f"Image '{image_name}' found locally (SDK)")
            return True
        except NotFound:
            logger.info(f"Image '{image_name}' not found locally (SDK)")
            return False
        except Exception as sdk_err:
            logger.warning(f"Docker SDK image lookup failed, falling back to CLI: {sdk_err}")

        try:
            result = self._run_command(["images", "-q", image_name], capture_output=True)
            exists = bool(result.stdout.strip())
            logger.info(f"Image '{image_name}' found locally" if exists else f"Image '{image_name}' not found locally")
            return exists
        except Exception as e:
            logger.warning(f"Failed to check if image exists: {e}")
            return False

    def _normalize_exposed_ports(self, exposed_ports: Any) -> list[int]:
        """Normalize Docker exposed ports metadata to a sorted list of port numbers."""
        if not exposed_ports:
            return []

        if isinstance(exposed_ports, dict):
            candidates = exposed_ports.keys()
        elif isinstance(exposed_ports, list):
            candidates = exposed_ports
        else:
            return []

        parsed: list[int] = []
        for candidate in candidates:
            value = str(candidate).split("/", 1)[0]
            if value.isdigit():
                parsed.append(int(value))

        return sorted(set(parsed))

    def inspect_image_runtime(self, image_name: str) -> dict:
        """Inspect image runtime metadata used to decide networking and startup behavior."""
        fallback = {"exposed_ports": [], "cmd": [], "entrypoint": []}

        try:
            client = self._get_client()
            image = client.images.get(image_name)
            config = (image.attrs or {}).get("Config", {}) or {}
            cmd = config.get("Cmd") or []
            entrypoint = config.get("Entrypoint") or []
            return {
                "exposed_ports": self._normalize_exposed_ports(config.get("ExposedPorts")),
                "cmd": cmd if isinstance(cmd, list) else [str(cmd)],
                "entrypoint": entrypoint if isinstance(entrypoint, list) else [str(entrypoint)],
            }
        except Exception as sdk_err:
            logger.warning(f"Docker SDK image inspect failed, falling back to CLI: {sdk_err}")

        try:
            result = self._run_command(
                ["image", "inspect", image_name, "--format", "{{json .Config}}"],
                capture_output=True,
            )
            config = json.loads(result.stdout.strip() or "{}")
            cmd = config.get("Cmd") or []
            entrypoint = config.get("Entrypoint") or []
            return {
                "exposed_ports": self._normalize_exposed_ports(config.get("ExposedPorts")),
                "cmd": cmd if isinstance(cmd, list) else [str(cmd)],
                "entrypoint": entrypoint if isinstance(entrypoint, list) else [str(entrypoint)],
            }
        except Exception as cli_err:
            logger.warning(f"Docker CLI image inspect failed for {image_name}: {cli_err}")

        return fallback

    def detect_internal_port(self, image_name: str, preferred_ports: Optional[list[int]] = None) -> Optional[int]:
        """Detect the best internal TCP port to bind based on image metadata."""
        preferred = preferred_ports or [80, 8080, 3000, 5000, 8000, 8081]
        runtime = self.inspect_image_runtime(image_name)
        exposed_ports: list[int] = runtime.get("exposed_ports", [])
        if not exposed_ports:
            return None

        for port in preferred:
            if port in exposed_ports:
                return port

        return exposed_ports[0]

    def should_use_keepalive_command(self, image_name: str) -> bool:
        """Return True for base/system images that typically exit immediately in detached mode."""
        runtime = self.inspect_image_runtime(image_name)
        exposed_ports: list[int] = runtime.get("exposed_ports", [])
        if exposed_ports:
            return False

        cmd_tokens = " ".join(str(v).strip().lower() for v in runtime.get("cmd", []))
        entrypoint_tokens = " ".join(str(v).strip().lower() for v in runtime.get("entrypoint", []))

        simple_shell_cmds = {"/bin/bash", "bash", "/bin/sh", "sh"}
        if not entrypoint_tokens and (not cmd_tokens or cmd_tokens in simple_shell_cmds):
            return True

        base_images = {"amazonlinux", "ubuntu", "debian", "alpine", "centos", "rockylinux", "fedora"}
        image_repo = image_name.split("@", 1)[0].split(":", 1)[0]
        image_short_name = image_repo.split("/")[-1].lower()

        return image_short_name in base_images

    def build_image_from_path(self, build_context: str, dockerfile_path: str, image_tag: str) -> str:
        """Build Docker image from a Dockerfile in a directory."""
        try:
            client = self._get_client()
            dockerfile_rel = os.path.relpath(dockerfile_path, build_context)
            client.images.build(
                path=build_context,
                dockerfile=dockerfile_rel,
                tag=image_tag,
                rm=True,
            )
            logger.info(f"Successfully built image with Docker SDK: {image_tag}")
            return image_tag
        except Exception as sdk_err:
            logger.warning(f"Docker SDK build failed, falling back to CLI: {sdk_err}")

        try:
            self._run_command(
                [
                    "build",
                    "-t",
                    image_tag,
                    "-f",
                    dockerfile_path,
                    build_context,
                ],
                capture_output=True,
            )
            logger.info(f"Successfully built image: {image_tag}")
            return image_tag
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to build image: {e.stderr}")
            raise Exception(f"Failed to build image: {e.stderr}") from e

    def run_container(
        self,
        image: str,
        name: str,
        port: Optional[int] = None,
        internal_port: Optional[int] = None,
        cpu_limit: str = "1.0",
        mem_limit: str = "512m",
        env_vars: dict | None = None,
        restart_policy: str = "always",
        command: Optional[list[str] | str] = None,
    ) -> str:
        """Run a Docker container and return its ID."""
        try:
            client = self._get_client()
            run_kwargs = {
                "image": image,
                "name": name,
                "detach": True,
                "mem_limit": mem_limit,
                "environment": env_vars or {},
                "restart_policy": {"Name": restart_policy},
            }

            if port is not None and internal_port is not None:
                run_kwargs["ports"] = {f"{internal_port}/tcp": port}

            if command:
                run_kwargs["command"] = command

            try:
                cpu_float = float(cpu_limit)
                if cpu_float > 0:
                    run_kwargs["nano_cpus"] = int(cpu_float * 1_000_000_000)
            except Exception:
                pass

            container = client.containers.run(**run_kwargs)
            logger.info(f"Container started with Docker SDK: {name} (ID: {container.id[:12]})")
            return container.id
        except Exception as sdk_err:
            logger.warning(f"Docker SDK run failed, falling back to CLI: {sdk_err}")

        args = [
            "run",
            "-d",
            "--name",
            name,
            "--cpus",
            str(cpu_limit),
            "--memory",
            mem_limit,
            "--restart",
            restart_policy,
        ]

        if port is not None and internal_port is not None:
            args.extend(["-p", f"{port}:{internal_port}"])

        if env_vars:
            for key, value in env_vars.items():
                args.extend(["-e", f"{key}={value}"])

        args.append(image)

        if command:
            if isinstance(command, list):
                args.extend(command)
            else:
                args.append(command)

        try:
            result = self._run_command(args, capture_output=True)
            container_id = result.stdout.strip()
            logger.info(f"Container started: {name} (ID: {container_id[:12]})")
            return container_id
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to run container: {e.stderr}") from e

    def start_container(self, container_id: str):
        """Start a stopped container."""
        try:
            client = self._get_client()
            container = client.containers.get(container_id)
            container.start()
            logger.info(f"Container started with Docker SDK: {container_id[:12]}")
            return
        except Exception as sdk_err:
            logger.warning(f"Docker SDK start failed, falling back to CLI: {sdk_err}")

        try:
            self._run_command(["start", container_id], capture_output=True)
            logger.info(f"Container started: {container_id[:12]}")
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to start container: {e.stderr}") from e

    def stop_container(self, container_id: str):
        """Stop a running container."""
        try:
            client = self._get_client()
            container = client.containers.get(container_id)
            container.stop()
            logger.info(f"Container stopped with Docker SDK: {container_id[:12]}")
            return
        except Exception as sdk_err:
            logger.warning(f"Docker SDK stop failed, falling back to CLI: {sdk_err}")

        try:
            self._run_command(["stop", container_id], capture_output=True)
            logger.info(f"Container stopped: {container_id[:12]}")
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to stop container: {e.stderr}") from e

    def remove_container(self, container_id: str, force: bool = True):
        """Remove a container."""
        try:
            client = self._get_client()
            container = client.containers.get(container_id)
            container.remove(force=force)
            logger.info(f"Container removed with Docker SDK: {container_id[:12]}")
            return
        except Exception as sdk_err:
            logger.warning(f"Docker SDK remove failed, falling back to CLI: {sdk_err}")

        args = ["rm"]
        if force:
            args.append("-f")
        args.append(container_id)

        try:
            self._run_command(args, capture_output=True)
            logger.info(f"Container removed: {container_id[:12]}")
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to remove container: {e.stderr}") from e

    def remove_containers_by_name_prefix(self, name_prefix: str, force: bool = True) -> int:
        """Remove all containers whose names start with the provided prefix."""
        removed = 0

        try:
            client = self._get_client()
            containers = client.containers.list(all=True, filters={"name": name_prefix})
            for container in containers:
                name = container.name or ""
                if not name.startswith(name_prefix):
                    continue
                try:
                    container.remove(force=force)
                    removed += 1
                except Exception as remove_err:
                    logger.warning(f"Failed to remove container by prefix via SDK ({name}): {remove_err}")
            return removed
        except Exception as sdk_err:
            logger.warning(f"Docker SDK prefix removal failed, falling back to CLI: {sdk_err}")

        try:
            result = self._run_command(
                ["ps", "-a", "--filter", f"name={name_prefix}", "--format", "{{.ID}} {{.Names}}"],
                capture_output=True,
            )
            lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
            for line in lines:
                parts = line.split()
                if len(parts) < 2:
                    continue
                container_id, container_name = parts[0], parts[1]
                if not container_name.startswith(name_prefix):
                    continue
                try:
                    self.remove_container(container_id, force=force)
                    removed += 1
                except Exception as remove_err:
                    logger.warning(f"Failed to remove container by prefix via CLI ({container_name}): {remove_err}")
        except Exception as cli_err:
            logger.warning(f"CLI prefix removal failed: {cli_err}")

        return removed

    def get_container_status(self, container_id: str) -> dict:
        """Get container status information."""
        try:
            client = self._get_client()
            container = client.containers.get(container_id)
            container.reload()
            attrs = container.attrs or {}
            state = attrs.get("State", {})
            name = attrs.get("Name", "").lstrip("/")
            return {
                "id": container.id,
                "status": state.get("Status", container.status),
                "running": bool(state.get("Running", container.status == "running")),
                "name": name,
            }
        except Exception as sdk_err:
            logger.warning(f"Docker SDK inspect failed, falling back to CLI: {sdk_err}")

        try:
            result = self._run_command(["inspect", container_id], capture_output=True)
            data = json.loads(result.stdout)
            if data:
                container_info = data[0]
                return {
                    "id": container_info["Id"],
                    "status": container_info["State"]["Status"],
                    "running": container_info["State"]["Running"],
                    "name": container_info["Name"].lstrip("/"),
                }
            return {}
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to get container status: {e.stderr}") from e

    def wait_for_container_running(self, container_id: str, timeout_seconds: int = 8) -> dict:
        """Wait for a short time and return the latest observed container status."""
        deadline = time.time() + max(timeout_seconds, 1)
        last_status: dict = {}

        while time.time() < deadline:
            try:
                last_status = self.get_container_status(container_id)
            except Exception as status_err:
                logger.warning(f"Failed while waiting for container {container_id[:12]} startup: {status_err}")
                return last_status

            if last_status.get("running"):
                return last_status

            runtime_status = str(last_status.get("status", "")).lower()
            if runtime_status in {"exited", "dead", "removing"}:
                return last_status

            time.sleep(0.5)

        return last_status

    def container_exists(self, container_id: str) -> bool:
        """Check if a Docker container exists without raising noisy errors for stale IDs."""
        if not container_id:
            return False

        try:
            client = self._get_client()
            client.containers.get(container_id)
            return True
        except NotFound:
            return False
        except Exception as sdk_err:
            logger.debug(f"Docker SDK existence check fallback for {container_id[:12]}: {sdk_err}")

        try:
            self._run_command(["inspect", container_id], capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            stderr = (e.stderr or "").lower()
            if "no such object" in stderr or "no such container" in stderr:
                return False
            logger.warning(f"Docker CLI existence check failed for {container_id[:12]}: {e.stderr}")
            return False
        except Exception as cli_err:
            logger.debug(f"Docker CLI existence fallback failed for {container_id[:12]}: {cli_err}")
            return False

    def get_container_logs(self, container_id: str, tail: int = 100) -> str:
        """Get container logs."""
        try:
            client = self._get_client()
            container = client.containers.get(container_id)
            logs = container.logs(tail=tail)
            if isinstance(logs, bytes):
                return logs.decode("utf-8", errors="replace")
            return str(logs)
        except Exception as sdk_err:
            logger.warning(f"Docker SDK logs failed, falling back to CLI: {sdk_err}")

        try:
            result = self._run_command(["logs", "--tail", str(tail), container_id], capture_output=True)
            return result.stdout
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to get container logs: {e.stderr}") from e

    async def get_container_stats_async(self, container_id: str) -> dict:
        """Get container resource usage stats asynchronously."""
        return await asyncio.to_thread(self.get_container_stats, container_id)

    def get_container_stats(self, container_id: str) -> dict:
        """Get container resource usage stats in sync contexts."""
        try:
            client = self._get_client()
            container = client.containers.get(container_id)
            raw_stats = container.stats(stream=False)
            stats = raw_stats if isinstance(raw_stats, dict) else {}
            return self._parse_sdk_stats(stats)
        except NotFound:
            logger.debug(f"Container {container_id[:12]} not found while collecting stats")
            return self._empty_stats()
        except Exception as sdk_err:
            logger.warning(f"Docker SDK stats failed, falling back to CLI for {container_id}: {sdk_err}")

        try:
            result = self._run_command(["stats", container_id, "--no-stream", "--format", "{{json .}}"], capture_output=True)
            output = result.stdout.strip()
            if not output:
                return self._empty_stats()

            lines = [line.strip() for line in output.split("\n") if line.strip()]
            clean_line = lines[-1]

            import re

            ansi_escape = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")
            clean_line = ansi_escape.sub("", clean_line)

            start = clean_line.find("{")
            end = clean_line.rfind("}")
            if start != -1 and end != -1:
                clean_line = clean_line[start : end + 1]

            stats_json = json.loads(clean_line)

            cpu_str = stats_json.get("CPUPerc", "0.00%").rstrip("%")
            cpu_percent = float(cpu_str) if cpu_str else 0.0

            mem_usage_str = stats_json.get("MemUsage", "0MiB / 0MiB").split(" / ")[0]
            memory_usage_mb = 0.0
            if "GiB" in mem_usage_str:
                memory_usage_mb = float(mem_usage_str.replace("GiB", "")) * 1024.0
            elif "MiB" in mem_usage_str:
                memory_usage_mb = float(mem_usage_str.replace("MiB", ""))
            elif "kB" in mem_usage_str:
                memory_usage_mb = float(mem_usage_str.replace("kB", "")) / 1024.0
            elif "B" in mem_usage_str:
                memory_usage_mb = float(mem_usage_str.replace("B", "")) / (1024.0 * 1024.0)

            mem_perc_str = stats_json.get("MemPerc", "0%").rstrip("%")
            memory_percent = float(mem_perc_str) if mem_perc_str else 0.0

            return {
                "cpu_percent": cpu_percent,
                "memory_usage_mb": memory_usage_mb,
                "memory_limit_mb": 0,
                "memory_percent": memory_percent,
                "network_rx_bytes": 0,
                "network_tx_bytes": 0,
                "network_rx_mb": 0,
                "network_tx_mb": 0,
            }
        except subprocess.CalledProcessError as e:
            stderr = (e.stderr or "").lower()
            if "no such object" in stderr or "no such container" in stderr:
                logger.debug(f"Container {container_id[:12]} not found in CLI stats path")
            else:
                logger.warning(f"Failed to get sync container stats for {container_id}: {e}")
            return self._empty_stats()
        except Exception as e:
            logger.warning(f"Failed to get sync container stats for {container_id}: {e}")
            return self._empty_stats()


_docker_service = None


def get_docker_service() -> DockerService:
    """Get the singleton Docker service instance."""
    global _docker_service
    if _docker_service is None:
        _docker_service = DockerService()
    return _docker_service
