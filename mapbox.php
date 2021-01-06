<?php



require(".env.php");


if( isset($_GET['vehicle'])) {

$vehicle= htmlentities($_GET['vehicle']);

  if(in_array($vehicle,array("driving-traffic","driving","walking","cycling")) 
     and isset($_GET['position']) 
     and preg_match('!^[0-9.-]+,[0-9.-]+;[0-9.-]+,[0-9.-]+$!',$_GET['position'])){

    $pos= $_GET['position'];

    $url = 'https://api.mapbox.com/directions/v5/mapbox/'.$vehicle.'/'.$pos.'?access_token='.$token.'&geometries=geojson';

    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);

    $result = curl_exec($curl);

    curl_close($curl);

    echo $result;

  }
}


?>
