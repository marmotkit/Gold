#!/usr/bin/env bash
# Install system dependencies
apt-get update
apt-get install -y python3-dev build-essential

# Upgrade pip
pip install --upgrade pip

# Install Python packages
pip install -r requirements.txt
