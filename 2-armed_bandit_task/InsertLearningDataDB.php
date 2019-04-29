<?php


include 'connectDB.php';

$EXP 		= stripslashes(htmlspecialchars($_POST['exp']));
$EXPID 		= stripslashes(htmlspecialchars($_POST['expID']));
$ID 		= stripslashes(htmlspecialchars($_POST['id']));
$TEST 		= stripslashes(htmlspecialchars($_POST['test']));
$TRIAL 		= stripslashes(htmlspecialchars($_POST['trial']));
$COND 		= stripslashes(htmlspecialchars($_POST['condition']));
$SYML 		= stripslashes(htmlspecialchars($_POST['symL']));
$SYMR 		= stripslashes(htmlspecialchars($_POST['symR']));
$CLR 		= stripslashes(htmlspecialchars($_POST['choice_left_right']));
$CGB 		= stripslashes(htmlspecialchars($_POST['choice_good_bad']));
$RGB 		= stripslashes(htmlspecialchars($_POST['reward_good_bad']));
$CFGB 		= stripslashes(htmlspecialchars($_POST['other_reward_good_bad']));
$RTIME 		= stripslashes(htmlspecialchars($_POST['reaction_time']));
$REW 		= stripslashes(htmlspecialchars($_POST['reward']));

$SESSION 	= stripslashes(htmlspecialchars($_POST['session']));
$P1 		= stripslashes(htmlspecialchars($_POST['p1']));
$P2 		= stripslashes(htmlspecialchars($_POST['p2']));
$MAG1 		= stripslashes(htmlspecialchars($_POST['magnitude1']));
$MAG2 		= stripslashes(htmlspecialchars($_POST['magnitude2']));
$VAL 		= stripslashes(htmlspecialchars($_POST['valence']));
$INF 		= stripslashes(htmlspecialchars($_POST['information']));
$OP1 		= stripslashes(htmlspecialchars($_POST['option1']));
$OP2 		= stripslashes(htmlspecialchars($_POST['option2']));
$V1 		= stripslashes(htmlspecialchars($_POST['v1']));
$V2 		= stripslashes(htmlspecialchars($_POST['v2']));
$INV 		= stripslashes(htmlspecialchars($_POST['inverted']));
$CTIME 		= stripslashes(htmlspecialchars($_POST['choice_time']));



$stmt = $db->prepare("INSERT INTO learning_data VALUE(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())");
$stmt->bind_param("sssiiiiiiiiisdiddddiiiiddis", $EXP,$EXPID,$ID,$TEST,$TRIAL,$COND,$SYML,$SYMR,$CLR,$CGB,$RGB,$CFGB,$RTIME,$REW,$SESSION,$P1,$P2,$MAG1,$MAG2,$VAL,$INF,$OP1,$OP2,$V1,$V2,$INV,$CTIME);
$stmt->execute();
$err = $stmt->errno ;
$data[] = array(
      'ErrorNo' => $err,
    );
$stmt->close();
 $db->close();
echo json_encode($data);
 ?>
