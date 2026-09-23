FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Migrations and seed data are run by the deployment (docker compose or the Kubernetes Job), not at container start.
CMD ["gunicorn", "config.wsgi", "--bind", "0.0.0.0:8000", "--workers", "2"]
