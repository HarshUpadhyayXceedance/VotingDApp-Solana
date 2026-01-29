#!/bin/bash

echo "🛑 Stopping any running solana-test-validator..."
pkill -f solana-test-validator

echo "🧹 Clearing local ledger data (reseting blockchain state)..."
rm -rf test-ledger

echo "🚀 Starting fresh validator in background..."
solana-test-validator --reset --quiet &
VALIDATOR_PID=$!

echo "⏳ Waiting for validator to start (5 seconds)..."
sleep 5

echo "🏗️ Building and Deploying program..."
cd voting-dapp
anchor build
anchor deploy

echo "✅ Validator and Program Reset Complete!"
echo "👉 Now: Refresh your web app, Initialize Admin Registry, and everything will work."
echo "Note: The validator is running in the background (PID: $VALIDATOR_PID). You can see logs in test-ledger/validator.log or just run 'solana logs' in another terminal."
