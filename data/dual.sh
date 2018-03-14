#!/bin/bash

# a bash script to concatenate two inputs and create a JSON with it

sleep 5 # to have the time to watch the job in the queue

contentInput1=`cat $input1`
contentInput2=`cat $input2`

echo -n "{"

if [ ${#contentInput1} -gt 2 ] && [ ${#contentInput2} -gt 2 ] # if there is something in content1 and in content2
then
	contentInput1=`echo $contentInput1 | sed s/'"'/''/g`
	contentInput2=`echo $contentInput2 | sed s/'"'/''/g`

	echo -n "\"concatenated\":\""
	echo -n `echo $contentInput1$contentInput2`
	echo -n "\""
fi

echo -n "}"