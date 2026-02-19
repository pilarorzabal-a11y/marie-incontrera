#!/bin/bash
# Correr esto LOCALMENTE para subir el agente al Oracle VM
# Reemplazá VM_HOST con la IP del VM y VM_KEY con la ruta a tu clave SSH

VM_HOST="144.22.186.186"
VM_USER="ubuntu"        # o "opc" dependiendo del VM
VM_KEY="~/.ssh/id_rsa"  # ajustá si tu clave tiene otro nombre

echo "→ Copiando archivos al VM..."
ssh -i "$VM_KEY" "$VM_USER@$VM_HOST" "mkdir -p /opt/tedx-agent"
scp -i "$VM_KEY" requirements.txt agent.py main.py start.sh "$VM_USER@$VM_HOST:/opt/tedx-agent/"

echo "→ Instalando dependencias..."
ssh -i "$VM_KEY" "$VM_USER@$VM_HOST" "
  cd /opt/tedx-agent
  python3 -m venv venv 2>/dev/null || true
  source venv/bin/activate
  pip install -q -r requirements.txt
  chmod +x start.sh
  echo '✓ Dependencias instaladas'
"

echo "→ Iniciando el agente..."
ssh -i "$VM_KEY" "$VM_USER@$VM_HOST" "
  cd /opt/tedx-agent
  pkill -f 'uvicorn main:app' 2>/dev/null || true
  sleep 1
  nohup bash start.sh > /opt/tedx-agent/agent.log 2>&1 &
  sleep 2
  curl -s http://localhost:8001/health && echo ' ← agente corriendo'
"

echo "✓ Deploy completo. Logs: ssh $VM_USER@$VM_HOST 'tail -f /opt/tedx-agent/agent.log'"
