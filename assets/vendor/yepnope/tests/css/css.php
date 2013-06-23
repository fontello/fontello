<?php
header('Content-Type: text/css');
header("Expires: Thu, 31 Dec 2020 20:00:00 GMT");
$subject = $_SERVER['REQUEST_URI'];
$pattern = '/\/sleep-(\d+)\//';
preg_match($pattern, $subject, $matches);
if (sizeof($matches) > 1) {
  sleep($matches[1]);
}

$parts = explode( "?", $_SERVER['REQUEST_URI'] );
$num = basename($parts[0], '.css');
echo '#item_' . str_replace(',','',$num) . ' { color: rgb(' . $num . '); }';
