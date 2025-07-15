FROM python:3.12

RUN pip install uv

WORKDIR /api

COPY . .
RUN uv venv
RUN uv sync

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

EXPOSE 8000

# Use the entrypoint script which handles migrations and starts the server
ENTRYPOINT ["./entrypoint.sh"]
