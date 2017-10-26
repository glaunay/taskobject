#!/bin/bash

# a simple bash script to create a JSON from each line of $inputFile

sleep 5

contentInput=`cat $input`

echo "{"

if [ ${#contentInput} -gt 2 ] # IF length of contentFile > 2
then
	i=0;
	tmp=`for line in $contentInput; do ((i++)); echo "\"myData line $i\" : \"$line\","; done`
	echo $tmp | cut -c1-$(expr ${#tmp} - 1)
fi

echo "}"
