<?php


include 'connectDB.php';

$EXP 		= stripslashes(htmlspecialchars($_POST['exp']));
$EXPID 		= stripslashes(htmlspecialchars($_POST['expID']));
$ID 		= stripslashes(htmlspecialchars($_POST['id']));
$TEST 		= stripslashes(htmlspecialchars($_POST['test']));
$TRIAL 		= stripslashes(htmlspecialchars($_POST['trial']));
$COND 		= stripslashes(htmlspecialchars($_POST['condition']));
$SYML 		= stripslashes(htmlspecialchars($_POST['symL']));
$SYMM 		= stripslashes(htmlspecialchars($_POST['symM']));
$SYMR 		= stripslashes(htmlspecialchars($_POST['symR']));
$CLMR 		= stripslashes(htmlspecialchars($_POST['choice_left_middle_right']));
$CGB 		= stripslashes(htmlspecialchars($_POST['choice_good_bad']));
$RGB 		= stripslashes(htmlspecialchars($_POST['reward_good_bad']));
$CFGB1 		= stripslashes(htmlspecialchars($_POST['other_reward_good_bad1']));
$CFGB2 		= stripslashes(htmlspecialchars($_POST['other_reward_good_bad2']));
$RTIME 		= stripslashes(htmlspecialchars($_POST['reaction_time']));

$REW 		= stripslashes(htmlspecialchars($_POST['reward']));
$SESSION 	= stripslashes(htmlspecialchars($_POST['session']));
$P1 		= stripslashes(htmlspecialchars($_POST['p1']));
$P2 		= stripslashes(htmlspecialchars($_POST['p2']));
$P3 		= stripslashes(htmlspecialchars($_POST['p3']));
$MEAN1 		= stripslashes(htmlspecialchars($_POST['mean1']));
$MEAN2 		= stripslashes(htmlspecialchars($_POST['mean2']));
$MEAN3 		= stripslashes(htmlspecialchars($_POST['mean3']));
$VAR1 		= stripslashes(htmlspecialchars($_POST['variance1']));
$VAR2 		= stripslashes(htmlspecialchars($_POST['variance2']));
$VAR3 		= stripslashes(htmlspecialchars($_POST['variance3']));
$VAL1 		= stripslashes(htmlspecialchars($_POST['valence1']));
$VAL2 		= stripslashes(htmlspecialchars($_POST['valence2']));
$VAL3 		= stripslashes(htmlspecialchars($_POST['valence3']));
$INF1 		= stripslashes(htmlspecialchars($_POST['information1']));
$INF2 		= stripslashes(htmlspecialchars($_POST['information2']));
$INF3 		= stripslashes(htmlspecialchars($_POST['information3']));
$OP1 		= stripslashes(htmlspecialchars($_POST['option1']));
$OP2 		= stripslashes(htmlspecialchars($_POST['option2']));
$OP3 		= stripslashes(htmlspecialchars($_POST['option3']));
$V1 		= stripslashes(htmlspecialchars($_POST['v1']));
$V2 		= stripslashes(htmlspecialchars($_POST['v2']));
$V3 		= stripslashes(htmlspecialchars($_POST['v3']));
$CTIME 		= stripslashes(htmlspecialchars($_POST['choice_time']));



$stmt = $db->prepare("INSERT INTO sophie_3opt_learning_data VALUE(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())");
$stmt->bind_param("sssiiisssiissssiissssssssssssssssssssss", $EXP,$EXPID,$ID,$TEST,$TRIAL,$COND,$SYML,$SYMM,$SYMR,$CLMR,$CGB,$RGB,$CFGB1,$CFGB2,$RTIME,$REW,$SESSION,$P1,$P2,$P3,$MEAN1,$MEAN2,$MEAN3,$VAR1,$VAR2,$VAR3,$VAL1,$VAL2,$VAL3,$INF1,$INF2,$INF3,$OP1,$OP2,$OP3,$V1,$V2,$V3,$CTIME);
$stmt->execute();
$err = $stmt->errno ;
$data[] = array(
      'ErrorNo' => $err,
    );
$stmt->close();
 $db->close();
echo json_encode($data);
 ?>
