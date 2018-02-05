#!/bin/bash

# a simple bash script to create a JSON from reversing the $input file

sleep 5

contentInput=`cat $input`

echo "{"

if [ ${#contentInput} -gt 2 ] # IF length of $contentInput > 2
then
	i=0;
	tmp=`for line in $contentInput; do ((i++)); echo "\"myData line $i\" : \"$line\","; done`
	echo $tmp | cut -c1-$(expr ${#tmp} - 1)
fi

echo "}"
