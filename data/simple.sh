#!/bin/bash

# a simple bash script to create a JSON from each line of $inputFile

sleep 8
echo "{"
i=0;
#less $inputFile
echo `for line in $(cat $input); do ((i++)); echo "\"myData line $i\" : \"$line\","; done | head --bytes -2;`

echo "}"
