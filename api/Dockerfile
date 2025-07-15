FROM python:3.12

# Install git and uv
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN pip install uv

WORKDIR /api

# Clone the BitCraft GameData repository
RUN git clone https://github.com/BitCraftToolBox/BitCraft_GameData.git /app/bitcraft-gamedata

# Copy local files
COPY . .
RUN uv venv
RUN uv sync

# Make the entrypoint script executable
RUN chmod +x entrypoint.sh

EXPOSE 8002

# Use the entrypoint script which handles migrations and starts the server
ENTRYPOINT ["./entrypoint.sh"]
