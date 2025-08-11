#!/bin/bash

echo "=== Instalando Google Chrome no WSL ==="

# Adicionar chave do repositório
echo "Adicionando chave do repositório Chrome..."
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add -

# Adicionar repositório
echo "Adicionando repositório Chrome..."
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'

# Atualizar lista de pacotes
echo "Atualizando lista de pacotes..."
sudo apt update

# Instalar Chrome
echo "Instalando Google Chrome..."
sudo apt install -y google-chrome-stable

# Instalar dependências do Puppeteer
echo "Instalando dependências do Puppeteer..."
sudo apt-get install -y \
    libnss3 \
    libxss1 \
    libasound2 \
    fonts-liberation \
    libappindicator3-1 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libgbm1 \
    libx11-xcb1 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm-dev \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    libcups2

# Verificar instalação
echo "Verificando instalação..."
if which google-chrome-stable > /dev/null; then
    echo "✅ Chrome instalado com sucesso!"
    echo "Caminho: $(which google-chrome-stable)"
    google-chrome-stable --version
else
    echo "❌ Erro na instalação do Chrome"
    exit 1
fi

echo ""
echo "=== Instalação concluída ==="
echo "Agora você pode continuar com a configuração do projeto."