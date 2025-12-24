#!/bin/bash
cd /home/kavia/workspace/code-generation/simple-notes-app-301627-301636/frontend_app
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

