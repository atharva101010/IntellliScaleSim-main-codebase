"""
Git operations service for cloning repositories and managing source code.
"""
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional
import logging
import shutil

logger = logging.getLogger(__name__)


class GitService:
    """Service for Git repository operations."""
    
    def clone_repository(
        self, 
        repo_url: str, 
        branch: str = "main", 
        token: Optional[str] = None
    ) -> str:
        """
        Clone a Git repository to a temporary directory.
        
        Args:
            repo_url: GitHub repository URL
            branch: Branch to clone (default: "main")
            token: Optional GitHub personal access token for private repos
            
        Returns:
            Path to cloned repository
            
        Raises:
            Exception: If git clone fails
        """
        # Create temp directory
        temp_dir = tempfile.mkdtemp(prefix="intelliscale_git_")
        logger.info(f"Created temp directory: {temp_dir}")
        
        try:
            # Add token to URL if provided (for private repos)
            if token:
                # Format: https://x-access-token:TOKEN@github.com/user/repo.git
                if "https://" in repo_url:
                    clone_url = repo_url.replace("https://", f"https://x-access-token:{token}@")
                else:
                    clone_url = repo_url
            else:
                clone_url = repo_url
            
            # Clone repository with shallow clone (depth=1) for faster cloning
            logger.info(f"Cloning repository: {repo_url} (branch: {branch})")
            result = subprocess.run(
                ["git", "clone", "--depth", "1", "--branch", branch, clone_url, temp_dir],
                capture_output=True,
                text=True,
                check=True
            )
            
            logger.info(f"Successfully cloned repository to {temp_dir}")
            return temp_dir
            
        except subprocess.CalledProcessError as e:
            # Cleanup on failure
            shutil.rmtree(temp_dir, ignore_errors=True)
            stderr = (e.stderr or "").strip()
            combined_output = f"{stderr}\n{e.stdout or ''}".lower()

            private_repo_signals = [
                "repository not found",
                "could not read username",
                "authentication failed",
                "permission denied",
                "access denied",
                "fatal: unable to access",
            ]

            if any(signal in combined_output for signal in private_repo_signals):
                logger.error(f"Private or inaccessible repository: {stderr}")
                raise Exception(
                    "GitHub repository is private or inaccessible. Please provide a valid GitHub access token with repo access permissions."
                )

            logger.error(f"Failed to clone repository: {stderr}")
            raise Exception(
                f"Failed to clone repository: {stderr or 'Unknown git error'}"
            )
    
    def find_dockerfile(
        self, 
        repo_path: str, 
        dockerfile_path: Optional[str] = None
    ) -> str:
        """
        Find Dockerfile in repository.
        
        Args:
            repo_path: Path to cloned repository
            dockerfile_path: Optional user-specified Dockerfile path
            
        Returns:
            Absolute path to Dockerfile
            
        Raises:
            FileNotFoundError: If Dockerfile not found
        """
        if dockerfile_path:
            # User specified path
            full_path = os.path.join(repo_path, dockerfile_path)
            if os.path.isfile(full_path):
                logger.info(f"Found Dockerfile at user-specified path: {dockerfile_path}")
                return full_path
            raise FileNotFoundError(f"Dockerfile not found at specified path: {dockerfile_path}")
        
        # Auto-detect Dockerfile in common locations
        common_paths = [
            "Dockerfile",
            "dockerfile",
            "docker/Dockerfile",
            ".docker/Dockerfile",
            "build/Dockerfile"
        ]
        
        for path in common_paths:
            full_path = os.path.join(repo_path, path)
            if os.path.isfile(full_path):
                logger.info(f"Auto-detected Dockerfile at: {path}")
                return full_path
        
        raise FileNotFoundError(
            "No Dockerfile found in repository. "
            "Checked locations: " + ", ".join(common_paths)
        )
    
    def cleanup_repository(self, repo_path: str) -> None:
        """
        Clean up cloned repository.
        
        Args:
            repo_path: Path to repository to delete
        """
        try:
            shutil.rmtree(repo_path, ignore_errors=True)
            logger.info(f"Cleaned up repository at {repo_path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup repository: {e}")
    
    def parse_dockerfile_expose(self, dockerfile_path: str) -> Optional[int]:
        """
        Parse Dockerfile to extract EXPOSE port.
        
        Args:
            dockerfile_path: Path to Dockerfile
            
        Returns:
            Exposed port number or None if not found
        """
        try:
            with open(dockerfile_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    # Look for EXPOSE directive
                    if line.upper().startswith('EXPOSE'):
                        # Extract port number
                        parts = line.split()
                        if len(parts) >= 2:
                            port_str = parts[1].split('/')[0]  # Handle "EXPOSE 8080/tcp"
                            try:
                                port = int(port_str)
                                logger.info(f"Found EXPOSE port in Dockerfile: {port}")
                                return port
                            except ValueError:
                                continue
            logger.warning(f"No EXPOSE directive found in Dockerfile")
            return None
        except Exception as e:
            logger.error(f"Failed to parse Dockerfile: {e}")
            return None


# Singleton instance
_git_service = None

def get_git_service() -> GitService:
    """Get or create GitService singleton instance."""
    global _git_service
    if _git_service is None:
        _git_service = GitService()
    return _git_service
