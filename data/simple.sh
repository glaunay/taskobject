#!/bin/bash

# a simple bash script to create a JSON from each line of $inputFile

sleep 5

contentInput=`cat $input`

echo -n "{"

if [ ${#contentInput} -gt 2 ] # IF length of contentInput > 2
then
	contentInput=`echo $contentInput | sed s/'"'/''/g`
	echo -n "\"reverse\":\""
	echo -n `echo $contentInput | rev`
	echo -n "\""
fi

echo -n "}"
