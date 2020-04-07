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
$MEAN1 		= stripslashes(htmlspecialchars($_POST['mean1']));
$MEAN2 		= stripslashes(htmlspecialchars($_POST['mean2']));
$VAR1 		= stripslashes(htmlspecialchars($_POST['variance1']));
$VAR2 		= stripslashes(htmlspecialchars($_POST['variance2']));
$VAL1 		= stripslashes(htmlspecialchars($_POST['valence1']));
$VAL2 		= stripslashes(htmlspecialchars($_POST['valence2']));
$INF1 		= stripslashes(htmlspecialchars($_POST['information1']));
$INF2 		= stripslashes(htmlspecialchars($_POST['information2']));
$OP1 		= stripslashes(htmlspecialchars($_POST['option1']));
$OP2 		= stripslashes(htmlspecialchars($_POST['option2']));
$V1 		= stripslashes(htmlspecialchars($_POST['v1']));
$V2 		= stripslashes(htmlspecialchars($_POST['v2']));
$CTIME 		= stripslashes(htmlspecialchars($_POST['choice_time']));



$stmt = $db->prepare("INSERT INTO sophie_learning_data VALUE(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())");
$stmt->bind_param("sssiiiiiiiiisiiddddddiiiiiidds", $EXP,$EXPID,$ID,$TEST,$TRIAL,$COND,$SYML,$SYMR,$CLR,$CGB,$RGB,$CFGB,$RTIME,$REW,$SESSION,$P1,$P2,$MEAN1,$MEAN2,$VAR1,$VAR2,$VAL1,$VAL2,$INF1,$INF2,$OP1,$OP2,$V1,$V2,$CTIME);
$stmt->execute();
$err = $stmt->errno ;
$data[] = array(
      'ErrorNo' => $err,
    );
$stmt->close();
 $db->close();
echo json_encode($data);
 ?>
