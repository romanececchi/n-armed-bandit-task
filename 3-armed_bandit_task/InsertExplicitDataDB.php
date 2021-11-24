<?php


include 'connectDB.php';

$EXP        = stripslashes(htmlspecialchars($_POST['exp']));
$EXPID      = stripslashes(htmlspecialchars($_POST['expID']));
$ID         = stripslashes(htmlspecialchars($_POST['id']));
$TEST       = stripslashes(htmlspecialchars($_POST['test']));
$TRIAL      = stripslashes(htmlspecialchars($_POST['trial']));
$OPT        = stripslashes(htmlspecialchars($_POST['opt']));
$ANSWER     = stripslashes(htmlspecialchars($_POST['answer']));
$VALUE      = stripslashes(htmlspecialchars($_POST['value']));
$REWARD     = stripslashes(htmlspecialchars($_POST['reward']));
$SUMREWARD  = stripslashes(htmlspecialchars($_POST['sumreward']));
$SYM        = stripslashes(htmlspecialchars($_POST['sym']));
$RTIME      = stripslashes(htmlspecialchars($_POST['reaction_time']));
$CTIME      = stripslashes(htmlspecialchars($_POST['choice_time']));



$stmt = $db->prepare("INSERT INTO sophie_3opt_explicit_data VALUE(?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())");
$stmt->bind_param("sssiisssiisss", $EXP,$EXPID,$ID,$TEST,$TRIAL,$OPT,$ANSWER,$VALUE,$REWARD,$SUMREWARD,$SYM,$RTIME,$CTIME);
$stmt->execute();
$err = $stmt->errno ;
$data[] = array(
      'ErrorNo' => $err,
    );
$stmt->close();
 $db->close();
echo json_encode($data);
 ?>
