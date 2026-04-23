FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV GUNICORN_WORKERS=2
ENV GUNICORN_THREADS=8
ENV APP_ENV=production

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=20s --timeout=3s --start-period=15s --retries=3 \
	CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/healthz', timeout=2)"

CMD ["sh", "-c", "gunicorn --workers ${GUNICORN_WORKERS} --threads ${GUNICORN_THREADS} --bind 0.0.0.0:5000 --timeout 120 app:app"]
