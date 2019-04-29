<?php



$database="magnitude18";
$host="localhost";
$user="root";
$password="sophie";

$db = new mysqli($host, $user, $password, $database);

if (mysqli_connect_errno()) {
   printf("DB error: %s", mysqli_connect_error());
   exit();
}

?>