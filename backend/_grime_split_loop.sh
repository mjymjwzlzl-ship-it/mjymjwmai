#!/bin/bash
cd /opt/ARATA/backend
LOG=/opt/ARATA/backend/_grime_split.log
echo "=== split loop start $(date) ===" >> $LOG
while IFS= read -r t; do
  [ -z "$t" ] && continue
  echo "--- $t ---" >> $LOG
  node split-webp.js "$t" 5000 2>&1 | tail -2 >> $LOG
done < /opt/ARATA/backend/_grime_split.txt
echo "=== split loop done $(date) ===" >> $LOG
