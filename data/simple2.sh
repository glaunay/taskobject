#!/bin/bash

# a simple bash script to put a "+" after each line of $inputFile

sleep 10
echo "{"
i=0;
#less $inputFile
echo `for line in $(cat $inputFile); do ((i++)); echo "$line +"; done`

echo "}"

