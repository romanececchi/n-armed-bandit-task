$(document).ready(function() {

	/*Initial Experiment Parameters*/
	var ExpName = 'Online_Frankiglione';	/* name of the experiment */
	var Language = "en";					/* langage of the instructions and questionnaire */
	var CompLink = 1;						/* display link at the end of the task? */
	var NumSessions = 1;					/* number of learning sessions */
	var MaxTrainingSessions = 2;			/* maximum number of training sessions */
	var TrainingThreshold   = 0.6;			/* performance threshold for the training test (if not, set to 0) */
	var Transfer  	  = 1;					/* add a transfer test? */
	var Questionnaire = 1;					/* add a questionnaire? */

	var NbTrainingTrials     = 6;			/* number of trials in each condition of the training */
	var TrialsPerCondition   = 40;			/* number of trials in each condition of each learning session */
	var	NbTransferTrials 	 = 2;			/* number of trials in each condition of the transfer test (or pair comparisons) */
	
	var TransferFeedback = 0;				/* add feedback in the transfer test? 0 = No, 1 = Partial, 2 = Complete */
	var InterLeaved_Learning = 1;			/* interleaved trials in the learning test? */
	var InterLeaved_Transfer = 1;			/* interleaved trials in the transfer test? */

	var online = 1;							/* send the data to the sql database using php? */


	/* Define all the different conditions for all the different sessions (repeat condition if several sessions)
	1 line = 1 condition
	first  = probability of reward for each symbol of the condition: p(reward) = 1-p(punishment)
	second = mean and variance for each symbol of the condition 
	third  = valence of the reward. 1 = positive, -1 = negative, 0 = both 
	fourth = feedback information for all symbols of the condition. 0 = Partial, 1 = Complete */

	var Conditions = [[[0.75,0.25],[[1,0],[1,0]], 1, 0,], 
					  [[0.75,0.25],[[1,0],[1,0]],-1, 0,], 
					  [[0.75,0.25],[[1,0],[1,0]], 0, 0,],];

	/* Define the conditions needed in the training */
	var TrainingConditions = shuffle(Conditions.slice(0,3));


	/* Define the different questionnaires you want if Questionnaire = 1 */
	var WhichQuestionnaires = [	PlayQuestionnaire_AUDIT, PlayQuestionnaire_CAST, PlayQuestionnaire_FTND, PlayQuestionnaire_HAD, PlayQuestionnaire_HPS,
								PlayQuestionnaire_LSAS,  PlayQuestionnaire_OCD,  PlayQuestionnaire_PDI,  PlayQuestionnaire_SSS, PlayQuestionnaire_RED];

	WhichQuestionnaires = shuffle(WhichQuestionnaires);


	/* /////////// END OF SET UP ////////// */


	/* Duration of the feedback on the screen */
	var fb_dur = 2000;	
	var fbpost_dur = 500 + 1500 * (TransferFeedback!=0);
	var border_color = "transparent";


	/* Retrieve the symbol pictures and define the options */
	var IMGPath = 'images/cards_gif/';
	var NbIMG = 15;
	var IMGExt = 'gif';
	var images=[];
	var available_options = [];
	for (var i = 1; i <= NbIMG; i++){
		available_options.push(i);
		images[i] = new Image();
		images[i].src = IMGPath+'stim/'+i+'.'+IMGExt;
		images[i].className = "img-responsive center-block";
		images[i].style.border="5px solid "+ border_color;
		images[i].style.position="relative";
		images[i].style.top="0px";
		images[i].style.width="100%";
	}
	available_options = shuffle(available_options);


	/* Now we create arrays for each trial with all the variables that will be sent to the database */

	/* Find the number of conditions per session */
	var NumCond = Conditions.length;
	var NumCondPerSession = NumCond/NumSessions; 
	var NumTrials = TrialsPerCondition*NumCond/NumSessions;
	var NumTrainingCond = TrainingConditions.length;

	/* We affect one couple of options for each condition */
	var AllOptions = [];
	var AllOptionValues = [];
	var AllOptionsOrder = [];
	var Options = [];
	for (var i=0;i<NumCond;i++){
		Options.push([available_options[2*i],available_options[2*i+1]]);
		AllOptions.push(available_options[2*i], available_options[2*i+1]);
		AllOptionValues.push(ProbaMag(Conditions[i],0), ProbaMag(Conditions[i],1));
		AllOptionsOrder.push((i+1)*2-1, (i+1)*2);
	}


	/* Construction of the Training Test */
	/* Careful: we need to use slice() to create a shallow copy of the array. If not, modifying the copy will modify the original array. */

	var TrOptions = [];
	var TrOptionValues = [];
	var TrOptionsOrder = [];
	var TrOptionsCond = [];
	var indexes = [];

	var k = 0;

	for(var i=NumCond;i<NumCond+NumTrainingCond;i++){
		for(var r = 0; r<NbTrainingTrials/2; r++){ /*montrer r fois chaque paire dans un ordre particulier*/
			TrOptions.push([available_options[2*i],available_options[2*i+1]], [available_options[2*i+1],available_options[2*i]]);
			TrOptionValues.push([AllOptionValues[2*(i-NumCond)].slice(0),AllOptionValues[2*(i-NumCond)+1].slice(0)], [AllOptionValues[2*(i-NumCond)+1].slice(0),AllOptionValues[2*(i-NumCond)].slice(0)]);
			TrOptionsOrder.push([AllOptionsOrder[2*(i-NumCond)],AllOptionsOrder[2*(i-NumCond)+1]], [AllOptionsOrder[2*(i-NumCond)+1],AllOptionsOrder[2*(i-NumCond)]]);
			TrOptionsCond.push([i-NumCond+1],[i-NumCond+1]);
			indexes.push(k);
			k++;
			indexes.push(k);
			k++;
		}
	}

	/* If the trials are interleaved, the whole session is shuffled. If they are in blocked, the trials are shuffled only within the conditions, within each session. */

	var indexes2 = [];

	if(InterLeaved_Learning){
		indexes2 = shuffle(indexes);
	} else {
		for(var i=0; i<NbTrainingTrials*NumTrainingCond; i=i+NbTrainingTrials){
			indexes2 = indexes2.concat(shuffle(indexes.slice(i,i+NbTrainingTrials)));
		}
	}
	indexes = indexes2;

	var TrainingOptions = [];
	var TrainingOptionValues = [];
	var TrainingOptionsOrder = [];
	var TrainingOptionsCond = [];

	for(var i = 0;i<indexes.length;i++){
		TrainingOptions.push(TrOptions[indexes[i]]);
		TrainingOptionValues.push(TrOptionValues[indexes[i]]);
		TrainingOptionsOrder.push(TrOptionsOrder[indexes[i]]);
		TrainingOptionsCond.push(TrOptionsCond[indexes[i]]);
	}

	/* Here we make the training test deterministic. Participants do it until they perfom above 60% of correct response rate */
	for (var i=0; i<TrainingOptionValues.length; i++){
		TrainingOptionValues[i][0][0] = Math.round(TrainingOptionValues[i][0][0]);
		TrainingOptionValues[i][1][0] = Math.round(TrainingOptionValues[i][1][0]);
	}

	/* Construction of the Learning Test */
	/* First we create vector with all trials, and then we randomize it. */

	var LOptions = [];
	var LOptionValues = [];
	var LOptionsOrder = [];
	var LOptionsCond = [];
	var indexes = [];

	var k = 0;
	for(var i = 0;i<AllOptionsOrder.length;i=i+2){
		for(var r = 0; r<TrialsPerCondition/2; r++){ /*montrer r fois chaque paire dans un ordre particulier*/
			LOptions.push([AllOptions[i],AllOptions[i+1]], [AllOptions[i+1],AllOptions[i]]);
			LOptionValues.push([AllOptionValues[i],AllOptionValues[i+1]], [AllOptionValues[i+1],AllOptionValues[i]]);
			LOptionsOrder.push([AllOptionsOrder[i],AllOptionsOrder[i+1]], [AllOptionsOrder[i+1],AllOptionsOrder[i]]);
			LOptionsCond.push([i/2+1],[i/2+1]);
			indexes.push(k);
			k++;
			indexes.push(k);
			k++;
		}
	}

	/* If the trials are interleaved, the whole session is shuffled. If they are in blocked, the trials are shuffled only within the conditions, within each session. */

	var ind = [];
	var indexes2 = [];

	if(InterLeaved_Learning){
		for( var s=0; s<NumSessions; s++){
			indexes2 = indexes2.concat(shuffle(indexes.slice(NumTrials*s,NumTrials*(s+1))));
		}
	} else {
		for( var s=0; s<NumSessions; s++){
			ind[s] = [];
			for(var i=s*NumTrials; i<(s+1)*NumTrials; i=i+TrialsPerCondition){
				ind[s] = ind[s].concat(shuffle(indexes.slice(i,i+TrialsPerCondition)));
			}
			indexes2 = indexes2.concat(shuffleByCond(ind[s],NumCondPerSession));
		}
	}
	indexes = indexes2;
	
	/* Then we create vectors in the same trial order of shuffled "indexes" */

	var LearningOptions = [];
	var LearningOptionValues = [];
	var LearningOptionsOrder = [];
	var LearningOptionsCond = [];

	for(var i = 0;i<indexes.length;i++){
		LearningOptions.push(LOptions[indexes[i]]);
		LearningOptionValues.push(LOptionValues[indexes[i]]);
		LearningOptionsOrder.push(LOptionsOrder[indexes[i]]);
		LearningOptionsCond.push(LOptionsCond[indexes[i]]);
	}

	var Sessions = [];
	for (s = 0; s < NumSessions; s++) {
		Sessions[s] = [];
		for (i=0; i<NumTrials; i++){
			Sessions[s].push([LearningOptions[s*NumTrials+i],LearningOptionValues[s*NumTrials+i],LearningOptionsOrder[s*NumTrials+i],LearningOptionsCond[s*NumTrials+i]]);
		}	
	}


	/* Construction of the Transfer Test */
	/* First we create vector with all trials, and then we randomize it. */

	var TOptions      = [];
	var TOptionValues = [];
	var TOptionsCond  = [];
	var TOptionsOrder = [];
	var indexes = [];

	var k = 0;
	for(var r=0; r<NbTransferTrials; r++){
		for(var i = NumTrials * (NumSessions-1); i<NumCond*2;i++){
			for(var j = NumTrials * (NumSessions-1); j<NumCond*2;j++){
				if (i!=j){
					TOptions.push([AllOptions[i],AllOptions[j]]);
					TOptionValues.push([AllOptionValues[i],AllOptionValues[j]]);
					TOptionsOrder.push([AllOptionsOrder[i],AllOptionsOrder[j]]);
					indexes.push(k);
					k++;
					TOptions.push([AllOptions[i],AllOptions[j]]);
					TOptionValues.push([AllOptionValues[i],AllOptionValues[j]]);
					TOptionsOrder.push([AllOptionsOrder[i],AllOptionsOrder[j]]);
					indexes.push(k);
					k++;

				}
			}
		}
	}

	if(InterLeaved_Transfer){
		indexes = shuffle(indexes);
	} else {
		indexes = shuffleByCond(indexes,NumCondPerSession);
	}

	/* Then we create vectors in the same trial order of shuffled "indexes" */

	var TransferOptions = [];
	var TransferOptionValues = [];
	var TransferOptionsOrder = [];
	var TransferOptionsCond = [];
	for(var i = 0;i<indexes.length;i++){
		TransferOptions.push(TOptions[indexes[i]]);
		TransferOptionValues.push(TOptionValues[indexes[i]]);
		TransferOptionsOrder.push(TOptionsOrder[indexes[i]]);
	}

	var NumTransferTrials = TransferOptions.length;

	/* /////////// END OF TRIAL CONSTRUCTION ////////// */


	var SumReward = 0;
	var TotalReward = 0;
	var SumGoodResp = 0;

	var Init_time = (new Date()).getTime();

	var ExpID = CreateCode(); /*utiliser expId comme identifiant supplementaire?*/

	var clickDisabeled = false;
	var TrainSess = -1;
	var maxDBCalls = 1;
	var browsInfo = GetOS()+' - '+GetBrowser();


	var log = '';
	var clog = '';

	var SubID = ExpID;

	var link = 'https://www.youtube.com';


	/* /////////// THE EXPERIMENT STARTS HERE ////////// */

//EndExperiment();
//PlayAllQuestionnaires()
	GetUserID();


	/* ///////////////////// */


	function Consent() {

		CreateDiv('Stage', 'TextBoxDiv');

		if(Language=='en'){
			var Title = '<H2 align = "center">Consent</H2><br>';

			var Info = '<H4>INFORMATION FOR THE PARTICIPANT</H4>' + 
				'You are about to participate in the research study entitled:<br>' + 
				'The domain-general role of reinforcement learning-based training in cognition across short and long time-spans<br>' + 
				'Researcher in charge: Pr. Stefano PALMINTERI<br>' + 
				'This study aims to understand the learning processes in decision-making. Its fundamental purpose is to investigate the cognitive mechanisms of these learning and decision-making processes. The proposed experiments have no immediate application or clinical value, but they will allow us to improve our understanding of the functioning brain.<br>' + 
				'We are asking you to participate in this study because you have been recruited by the RISC or Prolific platforms. <br>' + 
				'<H4>PROCEDURE</H4>' + 
				'During your participation in this study, we will ask you to answer several simple questionnaires and tests, which do not require any particular competence. Your internet-based participation will require approximately 30 minutes. <br>' + 
				'<H4>VOLUNTARY PARTICIPATION AND CONFIDENTIALITY</H4>' + 
				'Your participation in this study is voluntary. This means that you are consenting to participate in this project without external pressure. During your participation in this project, the researcher in charge and his staff will collect and record information about you.<br>' + 
				'In order to preserve your identity and the confidentiality of the data, the identification of each file will be coded, thus preserving the anonymity of your answers. We will not collect any personal data from the RISC or Prolific platforms.<br>' + 
				'The researcher in charge of this study will only use the data for research purposes in order to answer the scientific objectives of the project. The data may be published in scientific journals and shared within the scientific community, in which case no publication or scientific communication will contain identifying information. <br>' + 
				'<H4>RESEARCH RESULTS AND PUBLICATION</H4>' + 
				'You will be able to check the publications resulting from this study on the following link:<br>' + 
				'https://sites.google.com/site/stefanopalminteri/publications<br>' + 
				'<H4>CONTACT AND ADDITIONAL INFORMATION</H4>' + 
				'Email: humanreinforcementlearning@gmail.com<br>' + 
				'This research has received a favorable opinion from the Inserm Ethical Review Committee / IRB00003888 on November 13th, 2018.<br>' + 
				'Your participation in this research confirms that you have read this information and wish to participate in the research study.<br><br>'+
				'<H4>Please check all boxes before starting:<H4>';

			var Ticks ='<H4><input type="checkbox" name="consent" value="consent1"> I am 18 years old or more<br>' +
			'<input type="checkbox" name="consent" value="consent2"> My participation in this experiment is voluntary <br>' +
			'<input type="checkbox" name="consent" value="consent3"> I understand that my data will be kept confidential and I can stop at any time without justification <br></H4>' ;

			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="toInstructions" value="Next" ></div>';
		}
		else if(Language=='fr'){
			var Title = '<H2 align = "center">Consentement</H2><br>';
			var Info = '<H4>INFORMATION A L’ATTENTION DU PARTICIPANT</H4>' + 
				'Nous vous proposons de participer à la recherche intitulée :<br>' + 
				'The domain-general role of reinforcement learning-based training in cognition across short and long time-spans<br>' + 
				'Sous la direction du Pr. Stefano PALMINTERI,<br>' + 
				'visant à comprendre les processus d’apprentissage dans la prise de décision. Cette recherche a une visée fondamentale. Nous visons à comprendre les processus cognitifs de ces processus d’apprentissage et prise de décision et nous n’envisageons aucune application immédiate pour ces recherches. Les tests proposés n’ont aucune valeur clinique, cependant ils nous permettront d’avancer nos connaissances sur le fonctionnement du cerveau.<br>' + 
				'Nous vous sollicitons pour participer à cette étude car vous avez été recruté par la plateforme RISC ou Prolific. <br>' + 
				'<H4>PROCEDURE</H4>' + 
				'Lors de votre participation à cette étude, nous vous demanderons de répondre à plusieurs questionnaires et tests simples, qui ne nécessitent pas de compétence particulière. Votre participation repose sur des réponses sur internet d’une durée de à peu près 30 minutes. <br>' + 
				'<H4>PARTICIPATION VOLONTAIRE ET CONFIDENTIALITE</H4>' + 
				'Votre participation à cette étude est volontaire. Cela signifie que vous acceptez de participer à ce projet sans pression extérieure ou contrainte. Durant votre participation à ce projet, le chercheur responsable ainsi que son personnel recueilleront et consigneront dans un dossier les renseignements vous concernant.<br>'+
				'Afin de préserver votre identité ainsi que la confidentialité des données, l’identification de chaque dossier se fera par un numéro de code, préservant ainsi l’anonymat de vos réponses et nous ne demanderons aucune donnée personnelle au RISC ou a Prolific.<br>'+
				'Le chercheur responsable de cette étude n’utilisera les données qu’à des fins de recherche, dans le but de répondre aux objectifs scientifiques du projet. Les données pourront être publiées dans des revues scientifiques et partagées au sein de la communauté scientifique. Aucune publication ou communication scientifique ne renfermera d’information permettant de vous identifier. <br>' + 
				'<H4>RESULTATS DE LA RECHERCHE ET PUBLICATION</H4>' + 
				'Vous pourrez consulter les publications issues de cette étude sur le lien suivant :<br>' + 
				'https://sites.google.com/site/stefanopalminteri/publications<br>' + 
				'<H4>CONTACT ET INFORMATIONS SUPPLEMENTAIRES</H4>' + 
				'Email: humanreinforcementlearning@gmail.com<br>' + 
				'Cette recherche a reçu un avis favorable du comité d’évaluation éthique de l’Inserm/IRB00003888 le 13 novembre 2018.<br>' + 
				'Votre participation à cette recherche confirme que vous avez lu ces informations et acceptez de participer à cette étude.<br><br>'+
				'<H4>Veuillez cocher toutes les cases avant de commencer :<H4>';

			var Ticks ='<H4><input type="checkbox" name="consent" value="consent1"> J\'ai plus de 18 ans<br>' +
			'<input type="checkbox" name="consent" value="consent2"> Je suis volontaire pour participer à cette étude <br>' +
			'<input type="checkbox" name="consent" value="consent3"> Je comprends que mes données seront confidentielles et je peux abandonner l\'expérience sans justification<br></H4>' ;
			
			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="toInstructions" value="Suivant" ></div>';
		}

		$('#TextBoxDiv').html(Title + Info + Ticks);
		$('#Bottom').html(Buttons);

		$('#toInstructions').click(function() {
			if ($("input:checkbox:not(:checked)").length > 0) {
				alert('You must tick all check boxes to continue.');
			}else {
				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();
				/*SubID = GetUserID();*/		
				Instructions(1);
			};
		});
	};  /* function Consent() */

	function Instructions(PageNum) {

		var NumPages = 7;/*number of pages*/

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center">Instructions</H2>';

		switch (PageNum) {

			case 0:
			if(Language=='en'){
				var Info = '<H3 align = "center">You have to read the instructions again.<br><br> </H3>';
			}
			else if(Language=='fr'){
				var Info = '<H3 align = "center">Vous devez relire les instructions.<br><br> </H3>';
			}
			break;

			case 1:
			if(Language=='en'){
				var Info = '<H3 align = "center">This experiment is composed of five phases.<br><br>'+
					'The first and the second phases consist in performing a cognitive test.<br><br>'+
					'The third phase is composed of questions assessing reasoning.<br><br>'+
					'The fourth phase is a questionnaire about your perceived economic status.<br><br>'+
					'The final phase consists in a series of questionnaires assessing your psychological <br> attitudes and well-being.<br><br> </H3>';
			}
			else if(Language=='fr'){
				var Info = '<H3 align = "center">Cette expérience se déroule en cinq parties.<br><br>'+
					'Les première et deuxième parties consistent à réaliser un test cognitif.<br><br>'+
					'La troisième partie est composée de quelques questions visant à mesurer votre raisonnement.<br><br>'+
					'La quatrième partie est un questionnaire sur la perception de votre statut économique.<br><br>'+
					'La dernière partie est composée d\'une série de questionnaires visant à mesurer vos attitudes psychologiques et votre bien-être.<br><br> </H3>';
			}
			break;

			case 2:
			if(Language=='en'){
				var Info = '<H3 align = "center">In the cognitive experiment, your final payoff will depend on your choices.<br><br>'+
					'You can maximize your payoff by finding out which option makes you win more points.<br><br>'+
					'For each choice you make, you will see the number of points you won by choosing this particular option.<br><br>'+
					'At the end of the experiment, we will calculate the cumulated sum of the points you won and translate the score into real money according to the following rule.<br><br></H3>';
			}
			else if(Language=='fr'){
				var Info = '<H3 align = "center">Dans l\'expérience cognitive, votre indemnité finale dépendra de vos choix.<br><br>'+
					'Vous pouvez maximiser vos gains en trouvant quelle option vous fera gagner le plus de points.<br><br>'+
					'Pour chaque choix que vous ferez, vous verrez le nombre de points que vous avez gagnés en choisissant cette option.<br><br>'+
					'A la fin de l\'expérience, nous calculerons la somme cumulée des points que vous aurez gagnés et nous convertirons ce score en argent réel selon la règle suivante.<br><br></H3>';
			}
			break;

			case 3:
			if(Language=='en'){
				var Info = '<H3 align = "center">After a choice, you can receive the following outcomes:<br><br>'+
					'0 point = 0 pence<br>1 point = 2 pence<br>-1 point = -2 pence<br><br>'+
					'Across the two phases of the cognitive experiment, you can win a bonus up to 84 points = 1.68 pounds.<br><br></H3>';
			}
			else if(Language=='fr'){
				var Info = '<H3 align = "center">Après avoir fait votre choix, vous pouvez recevoir les points suivants:<br><br>'+
					'0 point = 0 centimes<br>1 point = 2 centimes<br>-1 point = -2 centimes<br><br>'+
					'Après les deux phases cognitives, vous pouvez gagner un bonus maximum de 84 points = 1,68 euros.<br><br></H3>';
			}
			break;

			case 4:
			if(Language=='en'){
				var Info = '<H3 align = "center">At each trial, you must choose between two abstract pictures by clicking on a picture.<br><br>'+
					'The crucial point is that, on average, one picture is more advantageous than the other in terms of both points to be won, as well as points not to be lost. '+
					'The side (left/right) does not matter.<br><br>'+
					'You can maximize the final payoff by choosing at each trial the pictures with the highest average value.<br><br>'+
					'Note: not losing points is equally important as winning points, as far as the calculation of the final payoff is concerned. <br><br></H3>';
			}
			else if(Language=='fr'){
				var Info = '<H3 align = "center">A chaque nouvel essai, vous devez choisir entre deux images abstraites en cliquant sur une image.<br><br>'+
					'Retenez bien que, en moyenne, une image est plus avantageuse que l\'autre, en termes de points à gagner ou de points à ne pas perdre. '+
					'Le côté (gauche/droite) n\'a aucune importance.<br><br>'+
					'Vous pouvez maximiser vos gains en choisissant à chaque fois les images avec la plus grande valeur moyenne.<br><br>'+
					'Nota bene : ne pas perdre de points est aussi important que de gagner des points, puisque tout compte dans le gain final.<br><br></H3>';
			}
			break;

			case 5:
			if(Language=='en'){
				var Info = '<H3 align = "center">In the first phase of the cognitive test, you will be informed about the result of your choices on each trial.<br><br>'+
					'In the second phase of the cognitive test, you will be informed about the results of your choices only at the end of the experiment.<br><br>'+
					'The first and the second phases of the cognitive test will use the same pictures and they will keep the same value in both phases.<br><br></H3>';
			}
			else if(Language=='fr'){
				var Info = '<H3 align = "center">Dans la première partie du test cognitif, vous verrez le résultat de votre choix à chaque essai.<br><br>'+
					'Dans la deuxième partie du test cognitif, vous ne verrez les résultats de vos choix qu\'à la fin de l\'expérience.<br><br>'+
					'Les première et deuxième parties du test cognitif utilisent les mêmes images et elles gardent la même valeur dans les deux parties.<br><br></H3>';
			}
			break;

			case 6:
			if(Language=='en'){
				var Info  = '<H3 align = "center"> Please answer the following questions <br>'+
				'(note, you will be redirected to the instructions if you do not respond correctly to all questions).</H3>'+

				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'-	your final payoff will depend on your choices during the cognitive test:'+
				'</h3></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="100" name= "answer1" value= 1> <label for="100"> True </label><br>' +
				'<input type= "radio" id="000" name= "answer1" value= 0> <label for="000"> False  </label><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>'+

				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'-	in the second phase of the test you will know the results of your choices on each trial:'+
				'</h3></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="00" name= "answer2" value= 0> <label for="00"> True </label><br>' +
				'<input type= "radio" id="10" name= "answer2" value= 1> <label for="10"> False  </label><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>'+

				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'-	the position where a picture appears determines its value:'+
				'</h3></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="0" name= "answer3" value= 0> <label for="0"> True </label><br>' +
				'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> False  </label><br><br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
			}
			else if(Language=='fr'){
				var Info  = '<H3 align = "center"> Please answer the following questions <br>'+
				'(note, you will be redirected to the instructions if you do not respond correctly to all questions).</H3>'+

				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'-	your final payoff will depend on your choices during the cognitive test:'+
				'</h3></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="100" name= "answer1" value= 1> <label for="100"> True </label><br>' +
				'<input type= "radio" id="000" name= "answer1" value= 0> <label for="000"> False  </label><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>'+

				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'-	in the second phase of the test you will know the results of your choices on each trial:'+
				'</h3></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="00" name= "answer2" value= 0> <label for="00"> True </label><br>' +
				'<input type= "radio" id="10" name= "answer2" value= 1> <label for="10"> False  </label><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>'+

				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'-	the position where a picture appears determines its value:'+
				'</h3></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="0" name= "answer3" value= 0> <label for="0"> True </label><br>' +
				'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> False  </label><br><br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
			}
			break;

			case 7:
			if(Language=='en'){
				var Info = '<H3 align = "center">Let\'s begin with a training!<br><br>'+
				'Please note that points won during the training do not count for the final payoff '+
				'and that the training will be re-iterated until you reach a threshold of '+ parseInt(TrainingThreshold*100) +'% of correct responses.  <br><br></H3>';
			}
			else if(Language=='fr'){
				var Info = '<H3 align = "center">Commençons avec un entrainement !<br><br>'+
				'(les points gagnés durant l\'entraînement ne comptent pas pour le gain final)<br><br></H3>';
			}
			break;

			default:
			var Info;
			break;

		};

		$('#TextBoxDiv').html(Title + Info);

		var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Back" value="Back" >\n\
		<input align="center" type="button"  class="btn btn-default" id="Next" value="Next" >\n\
		<input align="center" type="button"  class="btn btn-default" id="Start" value="Start!" ></div>';

		if(Language=='en'){
			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Back" value="Back" >\n\
			<input align="center" type="button"  class="btn btn-default" id="Next" value="Next" >\n\
			<input align="center" type="button"  class="btn btn-default" id="Start" value="Start!" ></div>';

		}
		else if(Language=='fr'){
			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Back" value="Précédent" >\n\
			<input align="center" type="button"  class="btn btn-default" id="Next" value="Suivant" >\n\
			<input align="center" type="button"  class="btn btn-default" id="Start" value="Commencer !" ></div>';

		}

		$('#Bottom').html(Buttons);

		if (PageNum === 1) {
			$('#Back').hide();
		};

		if (PageNum === 0) {
			$('#Back').hide();
		};
		
		if (PageNum === NumPages) {
			$('#Next').hide();
		};
		
		if (PageNum < NumPages) {
			$('#Start').hide();
		};

		$('#Back').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();

			if (PageNum === 1) {
				Information();
			} else {
				Instructions(PageNum - 1);
			}

		});


		if (PageNum === NumPages-1) {

			$('#Next').click(function() {

				if (parseInt($('input[type=radio][name=answer1]:checked').attr('value'))+
					parseInt($('input[type=radio][name=answer2]:checked').attr('value'))+
					parseInt($('input[type=radio][name=answer3]:checked').attr('value')) != 3) {

					Instructions(0);

				}else {

					$('#TextBoxDiv').remove();
					$('#Stage').empty();
					$('#Bottom').empty();
					Instructions(PageNum + 1);

				}
			});

		} else {

			$('#Next').click(function() {

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();
				Instructions(PageNum + 1);

			});;
		}

		$('#Start').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();

			if(online==1) SendExpDataDB(0);
			PlayLearning(0,0,0);

		});
	};  /* function Instructions(PageNum) */


	function PlayLearning(SessionNum,TrialNum,Phase) {

		if($('#TextBoxDiv').length == 0){
			CreateDiv('Stage', 'TextBoxDiv');
		}

		/* The variable Phase can be 0 (Training) or 1 (Learning) or 2 (Transfer) */

		if (Phase==0) {

			var Option        = TrainingOptions[TrialNum];
			var SymbolOptions = TrainingOptionValues[TrialNum];
			var Symbols       = [TrainingOptionsOrder[TrialNum][0],TrainingOptionsOrder[TrialNum][1]];
			var Cond          = TrainingOptionsCond[TrialNum][0];

		} else if(Phase==1) {

			var Option        = Sessions[SessionNum][TrialNum][0];	
			var SymbolOptions = Sessions[SessionNum][TrialNum][1];
			var Symbols       = [Sessions[SessionNum][TrialNum][2][0],Sessions[SessionNum][TrialNum][2][1]];
			var Cond          = Sessions[SessionNum][TrialNum][3][0];

		} else if(Phase==2){

			var Option        = TransferOptions[TrialNum];	
			var SymbolOptions = TransferOptionValues[TrialNum];
			var Symbols       = [TransferOptionsOrder[TrialNum][0],TransferOptionsOrder[TrialNum][1]];
			var Cond          = 0;
		}

		/* Affect the pictures to each Option */

		var Option1 = images[Option[0]];
		Option1.id = "Option1";
		Option1 = Option1.outerHTML;

		var Option2 = images[Option[1]];
		Option2.id = 'Option2';
		Option2 = Option2.outerHTML;

		if(Language=='en'){
			var Title = '<div id = "Title"><H2 align = "center"> <br><br><br><br></H2></div>';
		}
		else if(Language=='fr'){
			var Title = '<div id = "Title"><H2 align = "center"> <br><br><br><br></H2></div>';
		}

		var Count = '<div id = "Count"><H3 align = "center">Your current amount: '+ parseInt(SumReward)/1000 +' points<br><br><br><br></H3></div>';

		/* Create canevas for the slot machine effect, of the size of the images */

		var canvas1 = '<canvas id="canvas1" height="600" width="600" class="img-responsive center-block" style="border: 6px solid transparent; transform: translate(0%, -100%);position: relative; top: 0px;"></canvas>';
		var canvas2 = '<canvas id="canvas2" height="600" width="600" class="img-responsive center-block" style="border: 6px solid transparent; transform: translate(0%, -100%); position: relative; top: 0px;"></canvas>';

		var myCanvas  = '<div id = "cvrow" class="row row-centered" style= "transform: translate(0%, 0%);position:relative">' +
			' <div class="col-xs-1 col-md-1"></div>' +
			' <div class="col-xs-3 col-md-3">' + Option1 + canvas1 + '</div>' +
			' <div class="col-xs-4 col-md-4"></div>' +
			' <div class="col-xs-3 col-md-3">' + Option2 + canvas2 + '</div>' +
			' <div class="col-xs-1 col-md-1"></div></div>';

		/* myCanvas is a superposition of the symbol pictures and the interactive canvas */

		$('#TextBoxDiv').html(Title + myCanvas);

		var Choice_time = (new Date()).getTime();

		var targetElement = document.body;

		$('#canvas1').click(function() {
			if(clickDisabeled)
				return;
			clickDisabeled = true;
			fb = Reward(1);
			document.getElementById("canvas1").style.borderColor="black"; 
		}); 

		$('#canvas2').click(function() {
			if(clickDisabeled)
				return;
			clickDisabeled = true;
			fb = Reward(2);
			document.getElementById("canvas2").style.borderColor="black";          
		}); 


		function Reward(Choice) {

			var Reaction_time = (new Date()).getTime();

			var left_right = -1;
			if(Choice==2) {
				left_right = 1;
			}

			var P    = [];
			var Mean = [];
			var Var  = [];
			var Val  = [];
			var Info = [];

			var value = [];
			var OptionValues = [];

			var Rwd   = [];
			var Pun   = [];

			for (i=0; i<SymbolOptions.length; i++){

				P[i]    = SymbolOptions[i][0];
				Mean[i] = SymbolOptions[i][1];
				Var[i]  = SymbolOptions[i][2];
				Val[i]  = SymbolOptions[i][3];
				Info[i] = SymbolOptions[i][4];

				/* Expected values for all options */
				if(Val[i] > 0) {
					value[i] = P[i]*Mean[i]*Val[i];
				} else if (Val[i] < 0) {
					value[i] = (1-P[i])*Mean[i]*Val[i];
				} else if (Val[i] == 0) {
					value[i] = P[i]*Mean[i] - (1-P[i])*Mean[i];
				}

				OptionValues.push(parseInt(value[i]*1000)/1000);


				/* Reward and Punishment */
				if(Val[i]>0){
					Rwd[i] =  Math.randomGaussian(Mean[i],Var[i]);
					Pun[i] = 0;
				}else if (Val[i]<0){
					Rwd[i] = 0;
					Pun[i] = -Math.randomGaussian(Mean[i],Var[i]);
				}else if (Val[i]==0){
					Rwd[i] =  Math.randomGaussian(Mean[i],Var[i]);
					Pun[i] = -Math.randomGaussian(Mean[i],Var[i]);
				}
			}

			if (OptionValues[0]==OptionValues[1]){
				goodchoice = 0;
			} else if ( ((OptionValues[0]>OptionValues[1]) && (Choice==1)) || ((OptionValues[1]>OptionValues[0]) && (Choice==2))){
				goodchoice = 1;
			} else {
				goodchoice = -1;
			}

			SumGoodResp = SumGoodResp + (goodchoice+1)/2;

			var RandomNum1 = Math.random();
			var RandomNum2 = Math.random();

			if (Choice === 1) {	

				var ThisReward  = Pun[0];
				var OtherReward = Pun[0];

				if (RandomNum1 <= P[0]) {
					ThisReward = Rwd[0];
				}
				if (RandomNum2 <= P[1]) {
					OtherReward = Rwd[1];
				}

			} else {	

				var ThisReward  = Pun[1];
				var OtherReward = Pun[1];

				if (RandomNum2 <= P[1]) {
					ThisReward = Rwd[1];
				}
				if (RandomNum1 <= P[0]) {
					OtherReward = Rwd[0];
				}
			}

			SumReward = SumReward + 1000* ThisReward;

			var pic1 = document.getElementById("Option1");
			var pic2 = document.getElementById("Option2");

			var cv1 = document.getElementById("canvas1");
			var cv2 = document.getElementById("canvas2");

			if (Phase != 2) {

				if(Choice==1){

					setTimeout(function() {

						slideCard(pic1,cv1, ThisReward);

						if(Info[0]===1){
							cv2.style.border="3px solid black";
							slideCard(pic2,cv2, OtherReward);
						}
					}, 500)

				}else{

					setTimeout(function() {

						slideCard(pic2,cv2, ThisReward);

						if(Info[1]===1){
							cv1.style.border="3px solid black";
							slideCard(pic1,cv1, OtherReward);
						}
					}, 500)
				}

			} else if (Phase == 2) {

				if (TransferFeedback != 0){

					if(Choice==1){

						setTimeout(function() {

							slideCard(pic1,cv1, ThisReward);

							if(TransferFeedback == 2){
								cv2.style.border="3px solid black";
								slideCard(pic2,cv2, OtherReward);
							}
						}, 500)

					}else{

						setTimeout(function() {

							slideCard(pic2,cv2, ThisReward);

							if(TransferFeedback == 2){
								cv1.style.border="3px solid black";
								slideCard(pic1,cv1, OtherReward);
							}
						}, 500)
					}
				}
			}

			if(online==1) SendLearnDataDB(0);

			Next();

			function slideCard(pic,cv,rwd){  /* faire défiler la carte pour decouvrir le feedback */

				var img = new Image();
				img.src = pic.src;
				img.width = pic.width;
				img.height = pic.height

				var speed = 1; /*plus elle est basse, plus c'est rapide*/
				var y = 0; /*décalage vertical*/

				/*Programme principal*/

				var dy = 20;
				var x = 0;
				var ctx;

				img.onload = function() {

					/*récupérer le contexte du canvas*/

					canvas = cv;
					ctx = cv.getContext('2d');

					canvas.width = img.width;
					canvas.height = img.height;

					/*définir le taux de rafraichissement*/
					var scroll = setInterval(draw, speed);

					setTimeout(function(){

						pic.style.visibility="hidden";
						clearInterval(scroll)
						ctx.clearRect(0, 0, canvas.width, canvas.height);

						ctx.fillStyle = "white";
						ctx.fillRect(0, 0, canvas.width, canvas.height);
						
						ctx.font      = "8em Calibri";
						ctx.fillStyle = "black";
						ctx.textAlign = "center";
						ctx.textBaseline = "middle";
						ctx.fillText(rwd, canvas.width/2, canvas.height/2);

					},1000);
				}

				function draw() {

					ctx.clearRect(0, 0, canvas.width, canvas.height); /* clear the canvas*/

					/*réinitialise, repart du début*/
					if (y > img.height) {
						y = -img.height + y;
					}

					/*dessine image1 supplémentaire*/
					if (y > 0) {
						ctx.drawImage(img, x , -img.height + y , img.width, img.height);
					}

					/*dessine image*/					
					ctx.drawImage(img, x, y, img.width, img.height);

					/*quantité à déplacer*/
					y += dy;
				}
			};  /* function slideCard(pic,cv) */


	    	function SendLearnDataDB(call){

	    		clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ TEST: '+ Phase +' $ TRIAL: '+TrialNum+' $ COND: '+Cond+' $ SYML: '+Symbols[0]+' $ SYMR: '+Symbols[1]+
	    			' $ CLR: '+left_right+' $ CGB: '+((goodchoice == 1)?1:0)+' $ RGB: '+((ThisReward==(Pun[0]|Pun[1]))?0:1)+' $ CFGB: '+((OtherReward==(Pun[0]|Pun[1]))?0:1)+
	    			' $ RTIME: '+(Reaction_time-Choice_time)+ '$ REW: '+parseInt(SumReward)/1000+' $ SESSION: '+SessionNum+' $ P1: '+P[0]+' $ P2: '+P[1]+' $ MEAN1: '+Mean[0]+' $ MEAN2: '+Mean[1]+
	    			' $ VAR1: '+Var[0]+' $ VAR2: '+Var[1]+' $ VAL1: '+Val[0]+' $ VAL2: '+Val[1]+' $ INF1: '+Info[0]+' $ INF2: '+Info[1]+' $ OP1: '+Option[0]+' $ OP2: '+Option[1]+
	    			' $ V1: '+OptionValues[0]+' $ V2: '+OptionValues[1]+' $ CTIME: '+(Choice_time-Init_time);

	    		$.ajax({
	    			type: 'POST',
	    			data: {exp: ExpName, expID: ExpID, id: SubID, test: Phase, trial: TrialNum, condition:Cond, symL:Symbols[0], symR:Symbols[1],
	    			choice_left_right:left_right, choice_good_bad:((goodchoice == 1)?1:0), reward_good_bad:((ThisReward==(Pun[0]|Pun[1]))?0:1), other_reward_good_bad:((OtherReward==(Pun[0]|Pun[1]))?0:1),
	    			reaction_time:Reaction_time-Choice_time, reward: parseInt(SumReward)/1000, session: SessionNum, p1:P[0], p2:P[1], mean1:Mean[0], mean2:Mean[1],
	    			variance1:Var[0], variance2:Var[1], valence1:Val[0], valence2:Val[1], information1:Info[0], information2:Info[1], option1:Option[0], option2:Option[1],
	    			v1:OptionValues[0], v2:OptionValues[1], choice_time:Choice_time-Init_time},
	    			async: true,
	    			url: 'InsertLearningDataDB.php',

	    			success: function(r) {
	    				clog = 'learning_data $ '+clog+' $ dbcall success \n';
	    				log+= clog; 

	    				if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
	    					SendLearnDataDB(call+1);
	    				}
	    			},
	    			error: function(XMLHttpRequest, textStatus, errorThrown) {
	    				clog = 'learning_data $ '+clog+' $ dbcall failure \n';
	    				log+=clog;

	    				alert(errorThrown.responseText)

	    				if(call+1<maxDBCalls){
	    					SendLearnDataDB(call+1);
	    				}
	    			}
	    		});
	    	};  /* function SendLearnDataDB(call) */

	    	return ThisReward;
	    };  /* function Reward(Choice) */

	    function Next(){

	    	if(Phase==0){

		    	TrialNum++;

		    	if (TrialNum < NbTrainingTrials*NumTrainingCond) {
		    		setTimeout(function() {
		    			$('#stimrow').fadeOut(500);
		    			$('#fbrow').fadeOut(500);
		    			$('#cvrow').fadeOut(500);
		    			setTimeout(function() {
		    				clickDisabeled=false;
		    				PlayLearning(SessionNum,TrialNum,0);
		    			}, 500);
		    		}, fb_dur);
		    	} else {
		    		TrainSess--;
		    		setTimeout(function() {
		    			$('#TextBoxDiv').fadeOut(500);
		    			setTimeout(function() {
		    				$('#Stage').empty();
		    				$('#Bottom').empty();
		    				clickDisabeled=false;
		    				if (parseInt(SumGoodResp) < NbTrainingTrials*NumTrainingCond*TrainingThreshold) {
		    					ReTraining();
		    				} else {
		    					EndTrainingStartSessions();
		    				}
		    			}, 500);
		    		}, fb_dur);
		    	}

		    } else if (Phase == 1) {

		    	TrialNum++;
		    	
		    	if (TrialNum < NumTrials) {

		    		setTimeout(function() {
		    			$('#stimrow').fadeOut(500);
		    			$('#fbrow').fadeOut(500);
		    			$('#cvrow').fadeOut(500);
		    			setTimeout(function() {
		    				clickDisabeled=false;
		    				PlayLearning(SessionNum,TrialNum,1);

		    			}, 500);
		    		}, fb_dur);

		    	} else {
		    		SessionNum++;

		    		setTimeout(function() {
		    			$('#TextBoxDiv').fadeOut(500);
		    			setTimeout(function() {
		    				$('#Stage').empty();
		    				$('#Bottom').empty();
		    				clickDisabeled=false;
		    				NextSession(SessionNum);

		    			}, 500);
		    		}, fb_dur);
		    	}

		    } else if (Phase == 2) {
				TrialNum++;
				if (TrialNum < NumTransferTrials) {
					setTimeout(function() {
						$('#stimrow').fadeOut(500);
						$('#fbrow').fadeOut(500);
						$('#cvrow').fadeOut(500);
						setTimeout(function() {
							clickDisabeled=false;
							PlayLearning(0,TrialNum,2);
						}, 500);
					}, fbpost_dur);

				} else {
					setTimeout(function() {
						$('#TextBoxDiv').fadeOut(500);
						setTimeout(function() {
							$('#Stage').empty();
							$('#Bottom').empty();
							clickDisabeled=false;
							EndTransfer();
						}, 500);
					}, fbpost_dur);
				}
		    }
	    } /* function Next() */
	};  /* function PlayLearning() */

	function ReTraining(){

		// InsertLog(0,'train');

		var NumPages = 2; /*number of pages  */    

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';

		var instBut;
		var trainBut;
		var startBut;

		var ready;
		var steady;
		var go;

		var Info='';

		var toprint = parseInt(SumReward)/1000;
		var wonlost;	
		if(Language=='en'){
			wonlost= ' you won ';
			if (toprint<0){
				wonlost = ' you lost ';
			}

			Info += '<H3 align = "center">In this training,'+ wonlost +toprint+' points!</h3><br><br>';
		}else if(Language=='fr'){
			wonlost= ' gagné ';
			if (toprint<0){
				wonlost = ' perdu ';
			}

			Info += '<H3 align = "center">Dans cet entrainement, vous avez'+ wonlost +toprint+' points !</h3><br><br>';
		}

		SumReward=0;
		SumGoodResp=0;

		if(Language=='en'){
			Info += '<H3 align = "center">You have to do the training again.<br>Click when you are ready.</h3><br><br>';

			instBut  = '"Return to instructions"';
			trainBut = '"Play the practice again"';
			ready = 'Ready...';
			steady ='Steady...';
			go = 'Go!'
		}
		else if(Language=='fr'){
			Info += '<H3 align = "center">Vous devez refaire l\'entraînement.<br><br>Cliquez dès que vous êtes prêt.</h3><br><br>';

			instBut  = '"Retourner aux instructions"';
			trainBut = '"Rejouer l\'entrainement"';
			ready = 'A vos marques...';
			steady ='Prêt ?';
			go = 'Partez !'
		}

		$('#TextBoxDiv').html(Title + Info);

		var Buttons = '<div align="center">';
		Buttons+='<input align="center" type="button"  class="btn btn-default" id="Train" value='+trainBut+' >\n\ ';
		Buttons+='</div>';

		$('#Bottom').html(Buttons);

		$('#Inst').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();
			Instructions(1);

		});

		$('#Train').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();
			setTimeout(function() {
				$('#Stage').html('<H1 align = "center">'+ready+'</H1>');
				setTimeout(function() {
					$('#Stage').html('<H1 align = "center">'+steady+'</H1>');
					setTimeout(function() {
						$('#Stage').html('<H1 align = "center">'+go+'</H1>');
						setTimeout(function() {
							$('#Stage').empty();
							PlayLearning(0,0,0);
						}, 1000);
					}, 1000);
				}, 1000);
			}, 10);
		});
	} /* function EndTrainingStartSessions() */

	function EndTrainingStartSessions(){

		// InsertLog(0,'train');

		var NumPages = 2; /*number of pages  */    

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';

		var instBut;
		var trainBut;
		var startBut;

		var ready;
		var steady;
		var go;

		var Info='';

		var toprint = parseInt(SumReward)/1000;
		var wonlost;	
		if(Language=='en'){
			wonlost= ' you won ';
			if (toprint<0){
				wonlost = ' you lost ';
			}

			Info += '<H3 align = "center">In this training,'+ wonlost +toprint+' points!</h3><br><br>';
		}else if(Language=='fr'){
			wonlost= ' gagné ';
			if (toprint<0){
				wonlost = ' perdu ';
			}

			Info += '<H3 align = "center">Dans cet entrainement, vous avez'+ wonlost +toprint+' points!</h3><br><br>';
		}

		SumReward=0;

		if(Language=='en'){
			Info += '<H3 align = "center">Now, you are about to start the first phase of the test.<br>Click on start when you are ready.</h3><br><br>';

			instBut  = '"Return to instructions"';
			trainBut = '"Play the practice again"';
			startBut = '"Start the game"';
			ready = 'Ready...';
			steady ='Steady...';
			go = 'Go!'
		}
		else if(Language=='fr'){
			Info += '<H3 align = "center">Maintenant, vous allez commencer la première partie du test.<br><br>Cliquez sur commencer dès que vous êtes prêt.</h3><br><br>';

			instBut  = '"Retourner aux instructions"';
			trainBut = '"Rejouer l\'entrainement"';
			startBut = '"Commencer le jeu"';
			ready = 'A vos marques...';
			steady ='Prêt ?';
			go = 'Partez !'
		}

		$('#TextBoxDiv').html(Title + Info);

		var Buttons = '<div align="center">';
		if(TrainSess > -(MaxTrainingSessions+1)){
			Buttons+='<input align="center" type="button"  class="btn btn-default" id="Train" value='+trainBut+' >\n\ ';
		}
		Buttons+='<input align="center" type="button"  class="btn btn-default" id="Start" value='+startBut+' >';
		Buttons+='</div>';

		$('#Bottom').html(Buttons);

		$('#Inst').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();
			Instructions(1);

		});

		$('#Train').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();
			PlayLearning(0,0,0);

		});

		$('#Start').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();
			setTimeout(function() {
				$('#Stage').html('<H1 align = "center">'+ready+'</H1>');
				setTimeout(function() {
					$('#Stage').html('<H1 align = "center">'+steady+'</H1>');
					setTimeout(function() {
						$('#Stage').html('<H1 align = "center">'+go+'</H1>');
						setTimeout(function() {
							$('#Stage').empty();
							PlayLearning(0,0,1);
						}, 1000);
					}, 1000);
				}, 1000);
			}, 10);
		});
	} /* function EndTrainingStartSessions() */

	function NextSession(SessionNum){
		// InsertLog(0,'learn');
		if(SessionNum < NumSessions){
			EndSession(SessionNum);
		}else{
			if(Transfer){
				StartTransfer(1);
			}else if(Questionnaire){
				PlayAllQuestionnaires();
			}else{
				EndExperiment();
			}
		}
	} /* function NextSession(SessionNum) */

	function EndSession(SessionNum) {

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center">SESSION</H2>';

		var toprint = parseInt(SumReward)/1000;

		var wonlost;
		var Info;
		var nextBut;

		if (Language=='en'){
			wonlost= ' earned ';
			if (toprint<0){
				wonlost = ' lost ';
			}
			Info = '<H3 align = "center">So far, you have '+wonlost+toprint+' points.</h3><br><br>';
			nextBut='"Next"';
		}
		else if (Language=='fr'){
			wonlost= ' gagné ';
			if (toprint<0){
				wonlost = ' perdu ';
			}

			Info = '<H3 align = "center">Jusqu\'ici vous avez'+wonlost+toprint+' points.</h3><br><br>';

			nextBut='"Suivant"';
		}

		TotalReward= TotalReward+SumReward;
		SumReward = 0;

		$('#TextBoxDiv').html(Info);

		var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Next" value='+nextBut+' ></div>';

		$('#Bottom').html(Buttons);

		$('#Next').click(function() {
			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();

			PlayLearning(SessionNum,0,1);

		})
	} /* function EndSession(SessionNum) */

	function StartTransfer(PageNum) { /*text to uncomment for information*/

		var NumPages = 3;
		var toprint = parseInt(SumReward)/1000;

		CreateDiv('Stage', 'TextBoxDiv');

		if(Language=='en'){
			var Title = '<H3 align = "center">PHASE 2</H3>';
		}else if(Language=='fr'){
			var Title = '<H3 align = "center">PARTIE 2</H3>';
		}

		switch (PageNum) {

			case 1:
			if(Language=='en'){
				wonlost= ' earned ';
				if (toprint<0){
					wonlost = ' lost ';
				}
				var Info = '<H3 align="center"><br>You have finished the first phase of the cognitive experiment.<br> So far you have '+wonlost+toprint+' points!<br></h3><br><br>';
			}else if(Language=='fr'){
				wonlost= ' gagné ';
				if (toprint<0){
					wonlost = ' perdu ';
				}
				var Info = '<H3 align="center"><br>Vous avez fini la première partie de l\'expérience cognitive.<br> Vous avez'+wonlost+toprint+' points!<br></h3><br><br>';
			}
			break;

			case 2:
			if(Language=='en'){
				var Info = '<H3 align="center">You will now start the second phase of the task.<br><br>'+
					'You will be choosing between pictures you have seen in the first phase of the experiment.<br><br>'+
					'The pictures keep the same value as in the previous first phase, meaning that they give (on average) the same amount of points.<br><br>'+
					'The only difference is that the pictures are now presented in new combinations.<br><br></h3>';
			}else if(Language=='fr'){
				var Info = '<H3 align="center">Vous allez maintenant commencer la deuxième partie de l\'expérience.<br><br>'+
					'Vous allez choisir entre les images que vous avez vues dans la première partie de l\'expérience.<br><br>'+
					'Les images gardent les mêmes valeurs que précédemment, ce qui veut dire qu\'elles rapportent (en moyenne) le même nombre de points.<br><br>'+
					'La seule différence est que les images sont maintenant présentées dans de nouvelles combinaisons.<br><br></h3>';
			}
			break;

			case 3:
			if(Language=='en'){
			var Info = '<H3 align="center"><br>Click start when you are ready.<br></h3><br><br>';
			}else if(Language=='fr'){
			var Info = '<H3 align="center"><br>Cliquez sur "Commencer" quand vous êtes prêt.<br></h3><br><br>';
			}
			break;

			default:
			var Info;
			break;
		};

		$('#TextBoxDiv').html(Title + Info);

		if(Language=='en'){
			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Back" value="Back" >\n\
			<input align="center" type="button"  class="btn btn-default" id="Next" value="Next" >\n\
			<input align="center" type="button"  class="btn btn-default" id="Start" value="Start!" ></div>';
		}else if(Language=='fr'){
			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Back" value="Précédent" >\n\
			<input align="center" type="button"  class="btn btn-default" id="Next" value="Suivant" >\n\
			<input align="center" type="button"  class="btn btn-default" id="Start" value="Commencer !" ></div>';
		}

		$('#Bottom').html(Buttons);

		if (PageNum === 1) {
			$('#Back').hide();
		};

		if (PageNum === NumPages) {
			$('#Next').hide();
		};

		if (PageNum < NumPages) {
			$('#Start').hide();
		};

		$('#Back').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();
			StartTransfer(PageNum - 1);
		});

		$('#Next').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();
			StartTransfer(PageNum + 1);

		});

		$('#Start').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();

			if(Language=='en'){
				setTimeout(function() {
					$('#Stage').html('<H1 align = "center">Ready...</H1>');
					setTimeout(function() {
						$('#Stage').html('<H1 align = "center">Steady...</H1>');
						setTimeout(function() {
							$('#Stage').html('<H1 align = "center">Go!</H1>');
							setTimeout(function() {
								$('#Stage').empty();
								PlayLearning(0,0,2);
							}, 1000);
						}, 1000);
					}, 1000);
				}, 10);
			}else if(Language=='fr'){
				setTimeout(function() {
					$('#Stage').html('<H1 align = "center">A vos marques...</H1>');
					setTimeout(function() {
						$('#Stage').html('<H1 align = "center">Prêt ?</H1>');
						setTimeout(function() {
							$('#Stage').html('<H1 align = "center">Partez !</H1>');
							setTimeout(function() {
								$('#Stage').empty();
								PlayLearning(0,0,2);
							}, 1000);
						}, 1000);
					}, 1000);
				}, 10);
			}
		});
	};  /* function StartTransfer(PageNum) */

	function EndTransfer(){

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center">SESSION</H2>';

		var toprint = parseInt(SumReward)/1000;

		var wonlost;
		var Info;
		var nextBut;
		if(Language=='en'){
			wonlost = ' earned ';
			if (toprint<0){
				wonlost = ' lost ';
			}
			Info = '<H3 align = "center">You have finished the cognitive phase of the experiment.<br><br><br>'+ /* We don't show the monetary results yet. */
			'Thinking about the experiment, do you think you remember best the symbols with an overall positive value, those with a negative value or both?<br><br></h3>'+
			'<H4 align = "center">'+
			'<input type= "radio" id="1"  name= "answer" value= 1> <label for="1" > I remember best symbols with positive value </label><br>' +
			'<input type= "radio" id="-1" name= "answer" value=-1> <label for="-1"> I remember best symbols with negative value </label><br>' +
			'<input type= "radio" id="0"  name= "answer" value= 0> <label for="0" > I remember symbols with positive and negative value the same way </label><br>' +
			'</h4><br><br>';	
			nextBut = '"Next"';
		}
		else if (Language=='fr'){
			wonlost = ' gagné ';
			if (toprint<0){
				wonlost = ' perdu ';
			}
			Info = '<H3 align = "center">Vous avez terminé la partie cognitive.<br></h3><br><br>'; /* We don't show the monetary results yet. */
			nextBut = '"Suivant"';
		}

		TotalReward= TotalReward+SumReward;

		SumReward = 0;

		$('#TextBoxDiv').html(Info);

		Question_time = (new Date()).getTime();

		var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Next" value='+nextBut+' ></div>';

		$('#Bottom').html(Buttons);

		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {
				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('value') );
				answer_value = $("input:radio:checked").val();

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(Questionnaire){
					StartReasoningTest();
				}else{
					EndExperiment();
				}
			}
		})

		var questID = 'Transfer';
		var questNb = -1;
		var itemNum = 0;

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	} /* function EndTransfer() */

	function StartReasoningTest(){

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H3 align = "center">QUESTIONNAIRE</H3>';

		var startBut;

		if(Language=='en'){

			startBut = '"Start"'
			var Info = '<H3 align = "center">You are now about to start the third phase.<br>'+
			'You will see several items that vary in difficulty. Please answer as many as you can.</H3><br><br>';

		} else if(Language=='fr'){

			startBut = '"Commencer !"'
			var Info = '<H3 align = "center">Vous aller maintenant commencer la troisième partie.<br>'+
			'Il vous faut répondre à plusieurs questions dont la difficulté varie.</H3><br><br>';

		}

		$('#TextBoxDiv').html(Title+Info);

		var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Start" value='+startBut+' ></div>';

		$('#Bottom').html(Buttons);

		$('#Start').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();

			PlayQuestionnaire_CRT(1);
			
		});
	};  /* function StartReasoningTest() */

	function PlayQuestionnaire_CRT(QuestNum) {

		var NumQuestions = 7;	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 0;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = NumQuestions;

		if(Language=='en'){

			switch (QuestNum) { 

				case 1:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'A bat and a ball cost £1.10 in total. The bat costs £1.00 more than the ball. How much does the ball cost?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 5 pence </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 10 pence </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 9 pence </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 1 pence </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 1;

				break;

				case 2:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 5 minutes </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 100 minutes </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 20 minutes </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 500 minutes </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 2;

				break;

				case 3:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'In a lake, there is a patch of lily pads. Every day, the patch doubles in size. If it takes 48 days for the patch to cover the entire lake, how long would it take for the patch to cover half of the lake?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 47 days </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 24 days </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 12 days </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 36 days </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 3;

				break; 

				case 4:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'If John can drink one barrel of water in 6 days, and Mary can drink one barrel of water in 12 days, how long would it take them to drink one barrel of water together?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 4 days </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 9 days </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 12 days </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 3 days </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 4;

				break;

				case 5:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'Jerry received both the 15th highest and the 15th lowest mark in the class. How many students are in the class?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 29 students </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 30 students </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 1 student </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 15 students </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 5;

				break;

				case 6:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'A man buys a pig for £60, sells it for £70, buys it back for £80, and sells it finally for £90. How much has he made?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 20 pounds </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 10 pounds </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 0 pounds </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 30 pounds </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 6;

				break;

				case 7:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'Simon decided to invest £8,000 in the stock market one day early in 2008.  Six months after he invested, on July 17, the stocks he had purchased were down 50%. '+
				'Fortunately for Simon, from July 17 to October 17, the stocks he had purchased went up 75%. At this point, Simon:'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> has lost money. </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> is ahead of where he began. </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> has broken even in the stock market. </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> it cannot be determined. </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 7;

				break;

				default:
				break;
			}

			var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		}else if (Language=='fr'){

			switch (QuestNum) { 

				case 1:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'Une batte et une balle de baseball coûtent un total de 1,10€. La batte seule coûte 1.00€ de plus que la balle. Combien coûte la balle ?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 5 centimes </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 10 centimes </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 9 centimes </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 1 centime </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 1;

				break;

				case 2:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'Dans une usine, cinq machines produisent 5 objets en 5 minutes. Combien faut-il de temps à 100 machines pour produire 100 objets ?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 5 minutes </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 100 minutes </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 20 minutes </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 500 minutes </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 2;

				break;

				case 3:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'Sur un lac, il y a un carré de nénuphars. Chaque jour, le carré double en surface. Sachant qu\'il faut 48 jours pour que les nénuphars couvrent la totalité du lac, combien de jours leur faut-il pour en couvrir la moitié ?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 47 jours </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 24 jours </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 12 jours </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 36 jours </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 3;

				break; 

				case 4:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'Sachant que Jean peut boire un baril d\'eau en 6 jours, et que Marie peut boire un baril d\'eau en 12 jours, combien de temps leur faudra-t-il pour boire un baril d\'eau ensemble ?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 4 jours </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 9 jours </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 12 jours </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 3 jours </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 4;

				break;

				case 5:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'La note de Jérémie est à la fois la 15ème plus haute et la 15ème plus basse de sa classe. Combien y a-t-il d\'élèves dans la classe ?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 29 élèves </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 30 élèves </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 1 élève </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 15 élèves </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 5;

				break;

				case 6:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'Un homme achète un cochon pour 60€, le vend pour 70€, le rachète pour 80€, et le revend finalement pour 90€. Combien d\'argent a-t-il gagné ?'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> 20 euros </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> 10 euros </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> 0 euros </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 30 euros </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 6;

				break;

				case 7:
				var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
				'Simon a décidé d\'investir 8 000€ en bourse au début de l\'année 2008. Six mois après son investissement, le 17 juillet, les actions qu\'il a achetées ont perdu 50% de leur valeur. '+
				'Heureusement pour Simon, du 17 juillet au 17 octobre, les actions qu\'il a achetées ont ensuite augmenté de 75% de leur valeur. A ce moment, Simon :'+
				'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
				var contents = new Array();
				contents[0] = '<input type= "radio" id="3" name= "answer" value= 2> <label for="3"> a perdu de l\'argent. </label><br>';
				contents[1] = '<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> est plus riche que lorsqu\'il a commencé. </label><br>';
				contents[2] = '<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> a équilibré son budget en bourse. </label><br>';
				contents[3] = '<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> ça ne peut pas être déterminé. </label><br>';
				contents = shuffle(contents);
				var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				contents[0] + contents[1] + contents[2] + contents[3] +'<br><br><br>' +
				'</div><div class="col-xs-1 col-md-1"></div></div>';
				questID = "CRT-7";
				itemNum = 7;

				break;

				default:
				break;
			}

			var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"> <input type="button"  class="btn btn-default" id="Next" value="Suivant" > </div><div class="col-xs-1 col-md-1"></div></div>';

		};

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {
				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('value') );
				answer_value = $("input:radio:checked").val();

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_CRT(QuestNum);
				}else{
					PlayQuestionnaire_SES(0);					
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_CRT(QuestNum) */


	function PlayQuestionnaire_SES(QuestNum) {

		var NumQuestions = 9;   	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 11;			/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 0;

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">'+
			'<h3>You are about to do the fourth part of the experiment.<br><br>'+
			'The following questions provide a measure of your objective socioeconomic status. Your answers remain fully anonymous and will NOT be disclosed.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> I am ready. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'What is the highest grade (or year) of regular school you have completed? (check one)'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'None' +
			'<input type= "radio" id="0" name= "answer" value= 0 style="margin-left: 10"> <label for="0"> 0 </label><br>' +
			'Elementary/Middle School' +
			'<input type= "radio" id="1" name= "answer" value= 1 style="margin-left: 10"> <label for="1"> 1 </label>' +
			'<input type= "radio" id="2" name= "answer" value= 2 style="margin-left: 10"> <label for="2"> 2 </label>' +
			'<input type= "radio" id="3" name= "answer" value= 3 style="margin-left: 10"> <label for="3"> 3 </label>' +
			'<input type= "radio" id="4" name= "answer" value= 4 style="margin-left: 10"> <label for="4"> 4 </label>' +
			'<input type= "radio" id="5" name= "answer" value= 5 style="margin-left: 10"> <label for="5"> 5 </label>' +
			'<input type= "radio" id="6" name= "answer" value= 6 style="margin-left: 10"> <label for="6"> 6 </label>' +
			'<input type= "radio" id="7" name= "answer" value= 7 style="margin-left: 10"> <label for="7"> 7 </label>' +
			'<input type= "radio" id="8" name= "answer" value= 8 style="margin-left: 10"> <label for="8"> 8 </label><br>' +
			'High School' +
			'<input type= "radio" id="9" name= "answer" value= 9 style="margin-left: 10"> <label for="9"> 9 </label>' +
			'<input type= "radio" id="10" name= "answer" value= 10 style="margin-left: 10"> <label for="10"> 10 </label>' +
			'<input type= "radio" id="11" name= "answer" value= 11 style="margin-left: 10"> <label for="11"> 11 </label>' +
			'<input type= "radio" id="12" name= "answer" value= 12 style="margin-left: 10"> <label for="12"> 12 </label><br>' +
			'College/Junior College' +
			'<input type= "radio" id="13" name= "answer" value= 13 style="margin-left: 10"> <label for="13"> 13 </label>' +
			'<input type= "radio" id="14" name= "answer" value= 14 style="margin-left: 10"> <label for="14"> 14 </label>' +
			'<input type= "radio" id="15" name= "answer" value= 15 style="margin-left: 10"> <label for="15"> 15 </label>' +
			'<input type= "radio" id="16" name= "answer" value= 16 style="margin-left: 10"> <label for="16"> 16 </label><br>' +
			'Graduate School' +
			'<input type= "radio" id="17" name= "answer" value= 17 style="margin-left: 10"> <label for="17"> 17 </label>' +
			'<input type= "radio" id="18" name= "answer" value= 18 style="margin-left: 10"> <label for="18"> 18 </label>' +
			'<input type= "radio" id="19" name= "answer" value= 19 style="margin-left: 10"> <label for="19"> 19 </label>' +
			'<input type= "radio" id="20+" name= "answer" value= 20+ style="margin-left: 10"> <label for="20+"> 20+ </label><br>' +
			'<br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'What is the highest degree you earned?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> High school diploma or equivalency (GED) </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Associate degree (junior college) or vocational degree/license </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Bachelor’s degree </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Master’s degree </label><br>' +
			'<input type= "radio" id="5" name= "answer" value= 5> <label for="5"> Doctorate, Professional (MD, JD, DDS) </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> None of the above </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Besides yourself, how many people are currently living in your household?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> None </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer" value= 5> <label for="5"> More than 4 </label><br>' +
			'<br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Of these people, how many are under 18 years old?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> None </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer" value= 5> <label for="5"> More than 4 </label><br>' +
			'<br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Which of these categories best describes your total combined  family income for your household for the past 12 months? '+
			'This should include income (before taxes) from all sources, wages, rent from properties, social security, disability and/or veteran’s benefits, '+
			'unemployment benefits, workman’s compensation, help from relatives (including child payments and alimony), and so on.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> <$25,000 </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> $25,000-$50,000 </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> $50,000-$75,000 </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> $75,000-$100,000 </label><br>' +
			'<input type= "radio" id="5" name= "answer" value= 5> <label for="5"> $100,000-$150,000 </label><br>' +
			'<input type= "radio" id="6" name= "answer" value= 6> <label for="6"> ≥$150,000 </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Don’t Know/Not sure </label><br>' +
			'<input type= "radio" id="-1" name= "answer" value= -1> <label for="-1"> Decline to respond </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'The following questions measure your perception of your childhood and your current adult life. ' +
			'Please indicate your agreement with these statements. Please read each statement carefully, and then indicate how much you agree with the statement.<br><br>'+
			'My family and I have had enough money for things.' +
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 Strongly disagree </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer" value= 5> <label for="5"> 5 </label><br>' +
			'<input type= "radio" id="6" name= "answer" value= 6> <label for="6"> 6 </label><br>' +
			'<input type= "radio" id="7" name= "answer" value= 7> <label for="7"> 7 </label><br>' +
			'<input type= "radio" id="8" name= "answer" value= 8> <label for="8"> 8 </label><br>' +
			'<input type= "radio" id="9" name= "answer" value= 9> <label for="9"> 9 Strongly agree </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 6;

			break;

			case 7:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'I have lived in a relatively wealthy neighborhood.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 Strongly disagree </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer" value= 5> <label for="5"> 5 </label><br>' +
			'<input type= "radio" id="6" name= "answer" value= 6> <label for="6"> 6 </label><br>' +
			'<input type= "radio" id="7" name= "answer" value= 7> <label for="7"> 7 </label><br>' +
			'<input type= "radio" id="8" name= "answer" value= 8> <label for="8"> 8 </label><br>' +
			'<input type= "radio" id="9" name= "answer" value= 9> <label for="9"> 9 Strongly agree </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 7;

			break;

			case 8:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'I have felt relatively wealthy compared to other people in my neighborhood.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 Strongly disagree </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer" value= 5> <label for="5"> 5 </label><br>' +
			'<input type= "radio" id="6" name= "answer" value= 6> <label for="6"> 6 </label><br>' +
			'<input type= "radio" id="7" name= "answer" value= 7> <label for="7"> 7 </label><br>' +
			'<input type= "radio" id="8" name= "answer" value= 8> <label for="8"> 8 </label><br>' +
			'<input type= "radio" id="9" name= "answer" value= 9> <label for="9"> 9 Strongly agree </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 8;

			break;

			case 9:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Think of this ladder as representing where people stand in their communities. '+
			'People define community in different ways: please define it in whatever way is most meaningful to you.<br>'+
			'At the top of the ladder are the people who have the highest standing in their community. At the bottom are the people who have the lowest standing in their community.<br><br>'+
			'Where would you place yourself on this ladder?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="10" name= "answer" value= 10> <label for="10"> 10 Top - highest standing </label><br>' +
			'<input type= "radio" id="9"  name= "answer" value= 9>  <label for="9"> 9 </label><br>' +
			'<input type= "radio" id="8"  name= "answer" value= 8>  <label for="8"> 8 </label><br>' +
			'<input type= "radio" id="7"  name= "answer" value= 7>  <label for="7"> 7 </label><br>' +
			'<input type= "radio" id="6"  name= "answer" value= 6>  <label for="6"> 6 </label><br>' +
			'<input type= "radio" id="5"  name= "answer" value= 5>  <label for="5"> 5 </label><br>' +
			'<input type= "radio" id="4"  name= "answer" value= 4>  <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="3"  name= "answer" value= 3>  <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="2"  name= "answer" value= 2>  <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="1"  name= "answer" value= 1>  <label for="1"> 1 Bottom - lower standing </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SES-9";
			itemNum = 9;

			break;

			default:
			break;
		}

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {

				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_SES(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_SES(QuestNum) */

	function PlayAllQuestionnaires(){

		Questionnaire++;

		CreateDiv('Stage', 'TextBoxDiv');

		if (Questionnaire == 2) {

			var Title = '<H3 align = "center">QUESTIONNAIRE</H3>';

			var startBut;
			if(Language=='en') {
				startBut = '"Start"'
				var Info = '<H3 align = "center">You are now about to start the final phase.<br><br>Your answers remain fully anonymous and will NOT be disclosed.<br><br>'+
				'Note that the experiment will be considered completed (and the payment issued) only if the questionnaires are correctly filled.<br><br>'+
				'Please click "Start" when you are ready.</H3><br><br>';
			} else if (Language=='fr') {
				startBut = '"Commencer"'
				var Info = '<H3 align = "center">Maintenant, nous allons vous poser quelques questions.<br><br>Nous vous prions d\'y répondre le plus précisément possible.<br><br>Nous vous rappelons que les réponses sont anonymes et ne seront pas divulguées.<br><br>'+
				'Attention : l\'expérience ne sera complète que si les questionnaires sont correctement remplis.<br><br>'+
				'Cliquez sur Commencer dès que vous êtes prêt.</H3><br><br>';
			}

			$('#TextBoxDiv').html(Title+Info);

			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Start" value='+startBut+' ></div>';

			$('#Bottom').html(Buttons);

			$('#Start').click(function() {

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				WhichQuestionnaires[Questionnaire-2](0);
			});

		} else if (Questionnaire-2 < WhichQuestionnaires.length) {

			WhichQuestionnaires[Questionnaire-2](0);

		} else if (Questionnaire-2 == WhichQuestionnaires.length){

			PlayAllQuestionnaires();

		}
	};  /* function PlayAllQuestionnaires() */

	function PlayQuestionnaire_AUDIT(QuestNum) {

		var NumQuestions = 10;  	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 1;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 10;

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Do you ever have a drink containing alcohol?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1"  name= "answer" value= 1>  <label for="1"> Yes </label><br>' +
			'<input type= "radio" id="-1" name= "answer" value= -1> <label for="-1"> No </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'How often do you have a drink containing alcohol?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Monthly or less </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2-4 times a month </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 2-3 times a week </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 or more times a week </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'How many standard drinks containing alcohol do you have on a typical day when drinking?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not concerned </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 1 or 2 </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 3 or 4 </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 5 or 6 </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 7 or 9 </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 10 or more </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'How often do you have six or more drinks on one occasion?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Less than monthly </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Monthly </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Weekly </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Daily or almost daily </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'During the past year, how often have you found that you were not able to stop drinking once you had started?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Less than monthly </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Monthly </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Weekly </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Daily or almost daily </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'During the past year, how often have you failed to do what was normally expected of you because of drinking?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Less than monthly </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Monthly </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Weekly </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Daily or almost daily </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'During the past year, how often have you needed a drink in the morning to get yourself going after a heavy drinking session?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Less than monthly </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Monthly </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Weekly </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Daily or almost daily </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 6;

			break;

			case 7:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'During the past year, how often have you had a feeling of guilt or remorse after drinking?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Less than monthly </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Monthly </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Weekly </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Daily or almost daily </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 7;

			break;

			case 8:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'During the past year, have you been unable to remember what happened the night before because you had been drinking?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Less than monthly </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Monthly </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Weekly </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Daily or almost daily </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 8;

			break;

			case 9:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Have you or someone else been injured as a result of your drinking?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> No </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Yes, but not in the past year </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Yes, during the past year  </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 9;

			break;

			case 10:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Has a relative or friend, doctor or other health worker been concerned about your drinking or suggested you cut down?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> No </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Yes, but not in the past year </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Yes, during the past year  </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "AUDIT-10";
			itemNum = 10;

			break;
			default:

			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {
				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_AUDIT(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_AUDIT(QuestNum) */

	function PlayQuestionnaire_CAST(QuestNum) {

		var NumQuestions = 6;  	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 2;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 6;

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'In the last 12 months, have you smoked cannabis?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1"  name= "answer" value= 1>  <label for="1"> Yes </label><br>' +
			'<input type= "radio" id="-1" name= "answer" value= -1> <label for="-1"> No </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "CAST-6_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'In the last 12 months, have you smoked cannabis before midday?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Rarely </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> From time to time </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Fairly often </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Very often </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "CAST-6";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'In the last 12 months, have you smoked cannabis when you were alone?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Rarely </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> From time to time </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Fairly often </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Very often </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "CAST-6";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'In the last 12 months, have you had memory problems when you smoked cannabis?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Rarely </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> From time to time </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Fairly often </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Very often </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "CAST-6";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'In the last 12 months, have friends or members of your family told you that you ought to reduce your cannabis use?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Rarely </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> From time to time </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Fairly often </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Very often </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "CAST-6";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'In the last 12 months, have you tried to reduce or stop your cannabis use without succeeding?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Rarely </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> From time to time </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Fairly often </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Very often </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "CAST-6";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'In the last 12 months, have you had problems because of your use of cannabis (argument, fight, accident, bad result at school, etc)?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Never </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Rarely </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> From time to time </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Fairly often </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Very often </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "CAST-6";
			itemNum = 6;

			break;
			default:

			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {
				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_CAST(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_CAST(QuestNum) */

	function PlayQuestionnaire_FTND(QuestNum) {

		var NumQuestions = 6; 	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 3;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = NumQuestions;

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Do you smoke cigarettes on a daily basis?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1"  name= "answer" value= 1>  <label for="1"> Yes </label><br>' +
			'<input type= "radio" id="-1" name= "answer" value= -1> <label for="-1"> No </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "FTND-6_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'How soon after waking do you smoke your first cigarette?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Within 05 minutes </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 05-30 minutes </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 31-60 minutes </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Later than 60 minutes </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "FTND-6";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Do you find it difficult to refrain from smoking in places where it is forbidden (Church, Library, etc)?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Yes </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> No  </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "FTND-6";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Which cigarette would you hate to give up?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> The first in the morning </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Any other </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "FTND-6";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'How many cigarettes a day do you smoke?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 10 or less </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 11-20 </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 21-30 </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 31 or more  </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "FTND-6";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Do you smoke more frequently in the morning?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Yes </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> No  </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "FTND-6";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Do you smoke even if you are sick in bed most of the day?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Yes </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> No  </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "FTND-6";
			itemNum = 6;

			break;
			default:

			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {
				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_FTND(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_FTND(QuestNum) */

	function PlayQuestionnaire_HAD(QuestNum) {

		var NumQuestions = 14;	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 4;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 0;

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Select the answer corresponding to the reply that is closest to how you have been feeling in the past week. '+
			'Don’t take too long over you replies: your immediate is best.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> I am ready. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I feel tense or \'wound up\':'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Most of the time </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> A lot of the time </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> From time to time, occasionally </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I still enjoy the things I used to enjoy:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Definitely as much </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Not quite as much </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Only a little </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Hardly at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I get a sort of frightened feeling as if something awful is about to happen:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Very definitely and quite badly </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Yes, but not too badly </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little, but it doesn\'t worry me </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I can laugh and see the funny side of things:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> As much as I always could </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Not quite so much now </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Definitely not so much now </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Not at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Worrying thoughts go through my mind:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A great deal of the time </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> A lot of the time </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> From time to time, occasionally </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Only occasionally </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I feel cheerful:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Not at all </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Not often </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Sometimes </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Most of the time </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 6;

			break;

			case 7:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I can sit at ease and feel relaxed:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Definitely </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Usually </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Not often </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Not at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 7;

			break;

			case 8:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I feel as if I am slowed down:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Nearly all the time </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Very often </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Sometimes </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 8;

			break;

			case 9:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I get a sort of frightened feeling like \'butterflies\' in the stomach:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Occasionally </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Quite often </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Very often </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 9;

			break;

			case 10:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I have lost interest in my appearance:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Definitely </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> I don\'t take as much care as I should </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> I may not take quite as much care </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> I take just as much care as ever </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 10;

			break;

			case 11:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I feel restless as I have to be on the move:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Very much indeed </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Quite a lot </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Not very much </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 11;

			break;

			case 12:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I look forward with enjoyment to things:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> As much as I ever did </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Rather less than I used to </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Definitely less than I used to </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Hardly at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 12;

			break;

			case 13:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I get sudden feelings of panic:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Very often indeed </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Quite often </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Not very often </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 13;

			break;

			case 14:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I can enjoy a good book or radio or TV program:'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Often </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> Sometimes </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Not often </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> Very seldom </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HAD-14";
			itemNum = 14;

			break;

			default:
			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {

				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();
				
				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_HAD(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_HAD(QuestNum) */

	function PlayQuestionnaire_HPS(QuestNum) {

		var NumQuestions = 20;	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 5;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 0;

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Please answer each item true or false.  Please do not skip any items. It is important that you answer every item, even if you are not quite certain which is the best answer.<br>'+
			'Some items may sound like others, but all of them are slightly different.  Answer each item individually, and don\'t worry about how you answered a somewhat similar previous item.<br>'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> I am ready. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I am frequently so “hyper” that my friends kiddingly ask me what drug I’m taking.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Sometimes ideas and insights come to me so fast that I cannot express them all.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'In unfamiliar surroundings, I am often so assertive and sociable that I surprise myself.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 3;

			break;

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'There are often times when I am so restless that it is impossible for me to sit still.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Many people consider me to be amusing but kind of eccentric.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'When I feel an emotion, I usually feel it with extreme intensity.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 6;

			break;

			case 7:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I am frequently in such high spirits that I can’t concentrate on any one thing for too long.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 7;

			break;

			case 8:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I often feel excited and happy for no apparent reason.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 8;

			break;

			case 9:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I am usually in an average sort of mood, not too high and not too low.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 1> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 9;

			break;

			case 10:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I often have moods where I feel so energetic and optimistic that I feel I could outperform almost anyone at anything.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 10;

			break;

			case 11:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I very frequently get into moods where I wish I could be everywhere and do everything at once.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 11;

			break;

			case 12:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I like to have others think of me as a normal kind of person.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 1> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 12;

			break;

			case 13:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I often get into moods where I feel like many of the rules of life don’t apply to me.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 13;

			break;

			case 14:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I seem to be a person whose mood goes up and down easily.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 14;

			break;

			case 15:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I frequently find that my thoughts are racing.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 15;

			break;

			case 16:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I am so good at controlling others that it sometimes scares me.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 16;

			break;

			case 17:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I do most of my best work during brief periods of intense inspiration.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 17;

			break;

			case 18:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I seem to have an uncommon ability to persuade and inspire others.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 18;

			break;

			case 19:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I have often felt happy and irritable at the same time.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 19;

			break;

			case 20:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'A hundred years after I’m dead, my achievements will probably have been forgotten.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> True </label><br>' +
			'<input type= "radio" id="0" name= "answer" value= 1> <label for="0"> False </label><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "HPS-20";
			itemNum = 20;

			break;

			default:
			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);

		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {

				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();
				
				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_HPS(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}					
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_HPS(QuestNum) */

	function PlayQuestionnaire_LSAS(QuestNum) {

		var NumQuestions = 24;	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 6;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 0;

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'This measure assesses the way that social phobia plays a role in your life across a variety of situations. '+
			'Read each situation carefully and answer two questions about that situation. <br>The first question asks how anxious or fearful you feel in the situation. '+
			'The second question asks how often you avoid the situation. If you come across a situation that you ordinarily do not experience, '+
			'imagine “what if you were faced with that situation,” and then, rate the degree to which you would fear this hypothetical situation and how often you would tend to avoid it. <br>'+
			'Please base your ratings on the way that the situations have affected you in the last week. Fill out the following scale with the most suitable answer provided.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer1" value= 0> <label for="0"> I am ready. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '';
			questID = "LSAS-24_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Telephoning in public.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Participating in small groups.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Eating in public places.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Drinking with others in public places.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Talking to people in authority.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Acting, performing or giving a talk in front of an audience.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 6;

			break;

			case 7:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Going to a party.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 7;

			break;

			case 8:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Working while being observed.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 8;

			break;

			case 9:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Writing while being observed.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 9;

			break;

			case 10:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Calling someone you don’t know very well.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 10;

			break;

			case 11:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Talking with people you don’t know very well.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 11;

			break;

			case 12:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Meeting strangers.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 12;

			break;

			case 13:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Urinating in a public bathroom.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 13;

			break;

			case 14:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Entering a room when others are already seated.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 14;

			break;

			case 15:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Being the center of attention.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 15;

			break;

			case 16:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Speaking up at a meeting.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 16;

			break;

			case 17:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Taking a test.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 17;

			break;

			case 18:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Expressing a disagreement or disapproval to people you don’t know very well.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 18;

			break;

			case 19:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Looking at people you don’t know very well in the eyes.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 19;

			break;

			case 20:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Giving a report to a group.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 20;

			break;

			case 21:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Trying to pick up someone.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 21;

			break;

			case 22:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Returning goods to a store.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 22;

			break;

			case 23:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Giving a party.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 23;

			break;

			case 24:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Resisting a high pressure salesperson.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">'+ '<h3> Fear <br> </h3>' +
			'<input type= "radio" id="00" name= "answer1" value= 00> <label for="00"> None     </label><br>' +
			'<input type= "radio" id="10" name= "answer1" value= 10> <label for="10"> Mild     </label><br>' +
			'<input type= "radio" id="20" name= "answer1" value= 20> <label for="20"> Moderate </label><br>' +
			'<input type= "radio" id="30" name= "answer1" value= 30> <label for="30"> Severe   </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' + '<h3> Avoidance <br> </h3>' +
			'<input type= "radio" id="0" name= "answer2" value= 0> <label for="0"> Never (0%) </label><br>' +
			'<input type= "radio" id="1" name= "answer2" value= 1> <label for="1"> Occasionally (1-33%) </label><br>' +
			'<input type= "radio" id="2" name= "answer2" value= 2> <label for="2"> Often (34-66%) </label><br>' +
			'<input type= "radio" id="3" name= "answer2" value= 3> <label for="3"> Usually (67-100%) </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "LSAS-24";
			itemNum = 24;

			break;

			default:
			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks + Ticks2);

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input[name=answer1]:checked").length < 1 || ($("input[name=answer2]:checked").length < 1) && QuestNum>0) {

				alert('Please select one answer per category.');

			} else {

				Reaction_time = (new Date()).getTime();
				if (QuestNum==0) {
					answer = parseInt( $("input:radio:checked").attr('id') );
					answer_value = $("input:radio:checked").val();
				} else {
					answer = parseInt( $("input[name=answer1]:checked").attr('id') ) + parseInt( $("input[name=answer2]:checked").attr('id') );
					answer_value = $("input[name=answer1]:checked").attr('id')/10 + '' + $("input[name=answer2]:checked").val();
				}

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_LSAS(QuestNum); 
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});			

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_LSAS(QuestNum) */

	function PlayQuestionnaire_OCD(QuestNum) {

		var NumQuestions = 18;	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 7;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 0;

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'The following statements refer to experiences that many people have in their everyday lives. <br><br>'+
			'Choose the answer that best describes HOW MUCH that experience has DISTRESSED or BOTHERED you during the PAST MONTH.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> I am ready. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I have saved up so many things that they get in the way.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I check things more often than necessary.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I get upset if objects are not arranged properly.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I feel compelled to count while I am doing things.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I find it difficult to touch an object when I know it has been touched by strangers or certain people.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I find it difficult to control my own thoughts.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 6;

			break;

			case 7:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I collect things I don’t need.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 7;

			break;

			case 8:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I repeatedly check doors, windows, drawers, etc.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 8;

			break;

			case 9:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I get upset if others change the way I have arranged things.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 9;

			break;

			case 10:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I feel I have to repeat certain numbers.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 10;

			break;

			case 11:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I sometimes have to wash or clean myself simply because I feel contaminated.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 11;

			break;

			case 12:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I am upset by unpleasant thoughts that come into my mind against my will.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 12;

			break;

			case 13:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I avoid throwing things away because I am afraid I might need them later.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 13;

			break;

			case 14:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I repeatedly check gas and water taps and light switches after turning them off.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 14;

			break;

			case 15:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I need things to be arranged in a particular way.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 15;

			break;

			case 16:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I feel that there are good and bad numbers.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 16;

			break;

			case 17:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I wash my hands more often and longer than necessary.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 17;

			break;

			case 18:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'I frequently get nasty thoughts and have difficulty in getting rid of them.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> Not at all </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A little </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> Moderately </label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> A lot </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> Extremely </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "OCD-18";
			itemNum = 18;

			break;
			default:

			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {

				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();
				
				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_OCD(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_OCD(QuestNum) */

	function PlayQuestionnaire_PDI(QuestNum) {

		var NumQuestions = 21;	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 8;		/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 0;

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'This questionnaire is designed to measure beliefs and vivid mental experiences. We believe that they are much more common than has previously been supposed, '+
			'and that most people have had some such experiences during their lives. <br> Please answer the following questions as honestly as you can. '+
			'There are no right or wrong answers, and there are no trick questions. <br><br>' +
			'Please note that we are NOT interested in experiences people may have had when under the influence of drugs.<br><br>'+
			'Only for the questions you answer YES to, we are interested in: (a) how distressing these beliefs or experiences are; (b) how often you think about them; '+
			'and (c) how true you believe them to be. We would like you to choose the number which corresponds most closely to how '+
			'distressing this belief is, how often you think about it, and how much you believe that it is true. <br><br>' +
			'If you answer NO, please go straight to the next question.' +
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> I am ready. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks2 = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if people are reading your mind?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if things in magazines or on TV were written especially for you?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if some people are not what they seem to be?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if you are being persecuted in some way?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if there is a conspiracy against you?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if you are or destined to be someone very important?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 6;

			break;

			case 7:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel that you are a very special or unusual person?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 7;

			break;

			case 8:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel  that you are espacially close to God?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 8;

			break;

			case 9:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel that people can communicate telepathically?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 9;

			break;

			case 10:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if electrical devices such as computers can influence the way you think?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 10;

			break;

			case 11:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if you have been chosen by God in some way?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 11;

			break;

			case 12:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you believe in the power of witchcraft, voodoo or the occult?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 12;

			break;

			case 13:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Are you often worried that your partner may be unfaithful?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 13;

			break;

			case 14:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel that you have sinned more than the average person?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 14;

			break;

			case 15:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel  that people look at you oddly because of your appearance?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 15;

			break;

			case 16:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if you had no thoughts in your head at all?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 16;

			break;

			case 17:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if the world is about to end?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 17;

			break;

			case 18:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do your thoughts ever feel alien to you in some way?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 18;

			break;

			case 19:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Have your thoughts ever been so vivid that you were worried people would hear them?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 19;

			break;

			case 20:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel as if your own thoughts were being echoed back to you?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 20;

			break;

			case 21:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Do you ever feel  as if you are a robot or zombie without a will of your own?'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "ticks" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="no"  name= "answer" value= 0> <label for="no"> No </label><br><br>' +
			'<input type= "radio" id="yes" name= "answer" value= 1> <label for="yes"> Yes </label><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';

			var Ticks2 = '<div class="row"><div class="col-xs-4 col-md-4"></div><div id = "ticks2" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="100" name= "answer1" value= 100> <label for="100"> 1 Not at all distressing </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="200" name= "answer1" value= 200> <label for="200"> 2 </label><br>' +
			'<input type= "radio" id="300" name= "answer1" value= 300> <label for="300"> 3 </label><br>' +
			'<input type= "radio" id="400" name= "answer1" value= 400> <label for="400"> 4 </label><br>' +
			'<input type= "radio" id="500" name= "answer1" value= 500> <label for="500"> 5 Very distressing </label><br><br>'+

			'<input type= "radio" id="10" name= "answer2" value= 10> <label for="10"> 1 Hardly ever think about it </label><br>' +
			'<input type= "radio" id="20" name= "answer2" value= 20> <label for="20"> 2 </label><br>' +
			'<input type= "radio" id="30" name= "answer2" value= 30> <label for="30"> 3 </label><br>' +
			'<input type= "radio" id="40" name= "answer2" value= 40> <label for="40"> 4 </label><br>' +
			'<input type= "radio" id="50" name= "answer2" value= 50> <label for="50"> 5 Think about it all the time </label><br><br>'+

			'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> 1 Don\'t believe it\'s true </label><br>' +
			'<input type= "radio" id="2" name= "answer3" value= 2> <label for="2"> 2 </label><br>' +
			'<input type= "radio" id="3" name= "answer3" value= 3> <label for="3"> 3 </label><br>' +
			'<input type= "radio" id="4" name= "answer3" value= 4> <label for="4"> 4 </label><br>' +
			'<input type= "radio" id="5" name= "answer3" value= 5> <label for="5"> 5 Believe it is absolutely true </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "PDI-21";
			itemNum = 21;

			break;

			default:
			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks + Ticks2); 

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);

		document.getElementById('ticks2').style.display = 'none';

		$("input[id=yes]").click( function(){
			document.getElementById('ticks2').style.display = 'block';
		}) 
		$("input[id=no]").click( function(){
			document.getElementById('ticks2').style.display = 'none';
		}) 

		$('#Next').click(function() {

			if ((document.getElementById('ticks2').style.display == 'none' && ($("input:radio:checked").length < 1)) ||
				(document.getElementById('ticks2').style.display == 'block' && $("input:radio:checked").length < 4)) {

				alert('Please select one answer per category.');

			} else {

				Reaction_time = (new Date()).getTime();
				if (QuestNum==0) {
					answer = parseInt( $("input:radio:checked").attr('id') );
					answer_value = $("input:radio:checked").val();
				} else {
					if (document.getElementById('ticks2').style.display == 'none'){
						answer = parseInt( $("input[name=answer]:checked").attr('value'));
						answer_value = $("input[name=answer]:checked").val();
					} else {
						answer = parseInt( $("input[name=answer1]:checked").attr('id')) + parseInt( $("input[name=answer2]:checked").attr('id')) + parseInt( $("input[name=answer3]:checked").attr('id'));
						answer_value = $("input[name=answer1]:checked").attr('id')/100 + '' + $("input[name=answer2]:checked").attr('id')/10 + '' + $("input[name=answer3]:checked").val();
					}
				}

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_PDI(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_PDI(QuestNum) */

	function PlayQuestionnaire_RED(QuestNum) {

		var NumQuestions = 5;   	/*mettre a jour le nombre de pages (questions) via le script*/
		var questNb = 9;			/* number of the questionnaire */

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 0;

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">'+
			'<h3>Please read every question and indicate how much you agree or disagree.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> I am ready. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "RED-5_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'When I start eating, I just can’t seem to stop'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 0 Strongly Disagree </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 Disagree </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 Neither Agree nor Disagree</label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 Agree </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 Strongly Agree</label><br>' +
			'<br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "RED-5";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'When it comes to foods I love, I have no willpower'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 0 Strongly Disagree </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 Disagree </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 Neither Agree nor Disagree</label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 Agree </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 Strongly Agree</label><br>' +
			'<br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "RED-5";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'I don’t get full easily'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 0 Strongly Disagree </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 Disagree </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 Neither Agree nor Disagree</label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 Agree </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 Strongly Agree</label><br>' +
			'<br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "RED-5";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'I have days when I can’t seem to think about anything else but food'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 0 Strongly Disagree </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 Disagree </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 Neither Agree nor Disagree</label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 Agree </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 Strongly Agree</label><br>' +
			'<br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "RED-5";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7"><H3>'+
			'Food is always on my mind'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
			'<input type= "radio" id="0" name= "answer" value= 0> <label for="0"> 0 Strongly Disagree </label><br>' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> 1 Disagree </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 2> <label for="2"> 2 Neither Agree nor Disagree</label><br>' +
			'<input type= "radio" id="3" name= "answer" value= 3> <label for="3"> 3 Agree </label><br>' +
			'<input type= "radio" id="4" name= "answer" value= 4> <label for="4"> 4 Strongly Agree</label><br>' +
			'<br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "RED-5";
			itemNum = 5;

			break;

			default:
			break;
		}

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {

				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_RED(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_RED(QuestNum) */

	function PlayQuestionnaire_SSS(QuestNum) {

		var NumQuestions = 13; 	/*mettre a jour le nombre de pages (questions) via le script*/
		questNb = 10;

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center"></H2>';
		var Info;
		var questID;
		var itemNum;
		var answer;
		var answer_value;

		var Question_time;
		var Reaction_time;

		var nb_skip = 0;

		var Buttons = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"> <input type="button"  class="btn btn-default" id="Next" value="Next" > </div><div class="col-xs-1 col-md-1"></div></div>';

		switch (QuestNum) { 

			case 0:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'The following questions provide insights insight into your sensation-seeking tendencies. Please read each statement carefully, and then click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> I am ready. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13_instruction";
			itemNum = 0; 

			break;

			case 1:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. I would like a job that requires a lot of traveling. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. I would prefer a job in one location. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 1;

			break;

			case 2:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. I am invigorated by a brisk, cold day. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. I can’t wait to get indoors on a cold day. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 2;

			break;

			case 3:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. I get bored seeing the same old faces. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. I like the comfortable familiarity of everyday friends. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 3;

			break; 

			case 4:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> A. I would prefer living in an ideal society in which everyone is safe, secure, and happy. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> B. I would have preferred living in the unsettled days of our history. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 4;

			break;

			case 5:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. I sometimes like to do things that are a little frightening. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. A sensible person avoids activities that are dangerous. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 5;

			break;

			case 6:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> A. I would not like to be hypnotized. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> B. I would like to have the experience of being hypnotized. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 6;

			break;

			case 7:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. The most important goal in life is to live it to the fullest and experience as much as possible. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. The most important goal in life is to find peace and happiness. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 7;

			break;

			case 8:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. I would like to try parachute jumping. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. I would never want to try jumping out of a plane, with or without a parachute. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 8;

			break;

			case 9:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> A. I enter cold water gradually, giving myself time to get used to it. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> B. I like to dive or jump right into the ocean or a cold pool. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 9;

			break;

			case 10:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. When I go on a vacation, I prefer the change of camping out. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. When I go on a vacation, I prefer the comfort of a good room and bed. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 10;

			break;

			case 11:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. I prefer people who are emotionally expressive even if they are a bit unstable. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. I prefer people who are calm and even tempered. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 11;

			break;

			case 12:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 1> <label for="1"> A. A good painting should shock or jolt the senses. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 0> <label for="2"> B. A good painting should give one a feeling of peace and security. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 12;

			break;

			case 13:
			var Info  = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8"><H3>'+
			'Click on the choice, A or B, that best describes you.'+
			'</h3><br><br></div><div class="col-xs-1 col-md-1"></div></div>';
			var Ticks = '<div class="row"><div class="col-xs-3 col-md-3"></div><div id = "Middle" class="col-xs-8 col-md-8">' +
			'<input type= "radio" id="1" name= "answer" value= 0> <label for="1"> A. People who ride motorcycles must have some kind of unconscious need to hurt themselves. </label><br>' +
			'<input type= "radio" id="2" name= "answer" value= 1> <label for="2"> B. I would like to drive or ride a motorcycle. </label><br><br><br><br>' +
			'</div><div class="col-xs-1 col-md-1"></div></div>';
			questID = "SSS-13";
			itemNum = 13;

			break;
			default:

			break;

		};

		$('#TextBoxDiv').html(Title + Info + Ticks);

		Question_time = (new Date()).getTime();

		$('#Bottom').html(Buttons);


		$('#Next').click(function() {

			if ($("input:radio:checked").length < 1) {

				alert('Please select one answer.');

			} else {

				Reaction_time = (new Date()).getTime();
				answer = parseInt( $("input:radio:checked").attr('id') );
				answer_value = $("input:radio:checked").val();

				if(online==1) SendQuestDataDB(0);

				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();

				if(answer==-1){
					QuestNum+=nb_skip+1;
				} else  {
					QuestNum++;
				}

				if(QuestNum<=NumQuestions){
					PlayQuestionnaire_SSS(QuestNum);
				}else{
					if (Questionnaire-1 < WhichQuestionnaires.length) {
						PlayAllQuestionnaires();
					} else {
						EndExperiment();
					}
				}
			};
		});

		function SendQuestDataDB(call){
			clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ QUESTIONNAIRE: '+questID+' $ NUMBER: '+questNb+' $ ITEM: '+itemNum+' $ ANSWER: '+answer+' $ VAL:'+answer_value+' $ RTIME: '+(Reaction_time-Question_time);

			$.ajax({
				type: 'POST',
				data: {exp: ExpName, expID: ExpID, id: SubID, qid: questID, qnum: questNb, item: itemNum, ans: answer, val:answer_value, reaction_time:Reaction_time-Question_time},
				async: true,
				url: 'InsertQuestionnaireDataDB.php',
				/*dataType: 'json',*/
				success: function(r) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall success \n';
					log+= clog;

					if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					clog = 'questionnaire_data $ '+clog+' $ dbcall failure \n';
					log+=clog;

					if(call+1<maxDBCalls){
						SendQuestDataDB(call+1);
					}  
				}
			});
		};  /* function SendQuestDataDB(call) */
	}; /* function PlayQuestionnaire_SSS(QuestNum) */

	function EndExperiment() {

		CreateDiv('Stage', 'TextBoxDiv');

		var toprint = parseInt(TotalReward)/1000;

		var wonlost;
		if (Language=='en'){
			wonlost = ' earned ';
			if (toprint<0){
				wonlost = ' lost ';
			}
		}
		else if (Language=='fr'){
			wonlost = ' gagné ';
			if (toprint<0){
				wonlost = ' perdu ';
			}
		}

		if(Language=='en'){
			var Title = '<h3 align = "center">The game is over!<br>'+
				'You '+wonlost+toprint+' points in total, which is a bonus of '+toprint*2/100+' pounds.<br><br>Thank you for playing!<br><br>Please click the link to complete this study:<br></h3><br>';
			var url = '';
			if (CompLink)
				url = '<center><a href="'+link+'">Click here.</a></center>';
		} else if(Language=='fr'){
			var Title = '<h3 align = "center">L\'expérience est terminée !<br>'+
				'Vous avez '+wonlost+toprint+' points au total, ce qui correspond à '+toprint*2/100+' euros de bonus.<br><br>Merci de votre participation !<br><br>Cliquez sur ce lien pour compléter l\'étude :<br></h3><br>';
			var url = '';
			if (CompLink)
				url = '<center><a href="'+link+'">Cliquez ici.</a></center>';
		}

		$('#TextBoxDiv').html(Title+url);
	};  /* function EndExperiment() */


	/* /////////// END OF EXPERIMENT ////////// */


	function GetBrowser(){

		var nVer = navigator.appVersion;
		var nAgt = navigator.userAgent;
		var browserName  = navigator.appName;
		var fullVersion  = ''+parseFloat(navigator.appVersion);
		var majorVersion = parseInt(navigator.appVersion,10);
		var nameOffset,verOffset,ix;

		/*In Opera, the true version is after "Opera" or after "Version"*/
		if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
			browserName = "Opera";
			fullVersion = nAgt.substring(verOffset+6);
			if ((verOffset=nAgt.indexOf("Version"))!=-1)
				fullVersion = nAgt.substring(verOffset+8);
		}

		/*In MSIE, the true version is after "MSIE" in userAgent*/
		else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
			browserName = "Microsoft Internet Explorer";
			fullVersion = nAgt.substring(verOffset+5);
		}

		/*In Chrome, the true version is after "Chrome"*/
		else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
			browserName = "Chrome";
			fullVersion = nAgt.substring(verOffset+7);
		}

		/*In Safari, the true version is after "Safari" or after "Version"*/
		else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
			browserName = "Safari";
			fullVersion = nAgt.substring(verOffset+7);
			if ((verOffset=nAgt.indexOf("Version"))!=-1)
				fullVersion = nAgt.substring(verOffset+8);
		}

		/*In Firefox, the true version is after "Firefox"*/
		else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
			browserName = "Firefox";
			fullVersion = nAgt.substring(verOffset+8);
		}

		/*In most other browsers, "name/version" is at the end of userAgent*/
		else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) < (verOffset=nAgt.lastIndexOf('/')) ){
			browserName = nAgt.substring(nameOffset,verOffset);
			fullVersion = nAgt.substring(verOffset+1);
			if (browserName.toLowerCase()==browserName.toUpperCase()) {
				browserName = navigator.appName;
			}
		}

		if ((ix=fullVersion.indexOf(";"))!=-1)
		fullVersion=fullVersion.substring(0,ix);
		if ((ix=fullVersion.indexOf(" "))!=-1)
			fullVersion=fullVersion.substring(0,ix);

		majorVersion = parseInt(''+fullVersion,10);

		if (isNaN(majorVersion)) {
			fullVersion  = ''+parseFloat(navigator.appVersion);
			majorVersion = parseInt(navigator.appVersion,10);
		}

		return   browserName+' '+fullVersion+' '+majorVersion+' '+navigator.appName+' '+navigator.userAgent;
	} /* function GetBrowser() */

	function GetOS(){
		var OSName="Unknown OS";
		if (navigator.appVersion.indexOf("Win")!=-1) OSName="Windows";
		if (navigator.appVersion.indexOf("Mac")!=-1) OSName="MacOS";
		if (navigator.appVersion.indexOf("X11")!=-1) OSName="UNIX";
		if (navigator.appVersion.indexOf("Linux")!=-1) OSName="Linux";
		return OSName;
	} /* function GetOS() */

	function GetUserID() {

		CreateDiv('Stage', 'TextBoxDiv');

		if(Language=='en'){
			//var Title = '<H3 align = "justify">Before you start, please:<br><br>- maximize your browser window<br><br>- switch off phone/e-mail/music & anything else distracting<br><br>- and please enter your Prolific ID: <input type="text" id = "textbox_id" name="ID"></H3>';
			var Title = '<H3 align = "center">Please enter your Prolific ID: <input type="text" id = "textbox_id" name="ID"></H3>';
			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="toConsent" value="Next" ></div>';

		}else if(Language=='fr'){
			var Title = '<H3 align = "center">Veuillez choisir un identifiant : <input type="text" id = "textbox_id" name="ID"></H3>';
			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="toConsent" value="Suivant" ></div>';
		} 

		var TextInput = '';
		$('#TextBoxDiv').html(Title+TextInput);

		$('#Bottom').html(Buttons);

		$('#toConsent').click(function() {

			if(document.getElementById('textbox_id').value!=''){

				SubID = document.getElementById('textbox_id').value;
				$('#TextBoxDiv').remove();
				$('#Stage').empty();
				$('#Bottom').empty();
				Consent();
			}else{
				if(Language=='en'){
					alert('You must enter your Prolific ID.');
				}else if(Language=='fr'){
					alert('Vous devez entrer un identifiant.');
				}
			}
		});
	};  /* function GetUserID() */

	function CreateCode() {

		return Math.floor(Math.random() * 10000000000);
	};  /* function CreateCode() */

	function CreateDiv(ParentID, ChildID) {

		var d = $(document.createElement('div'))
		.attr("id", ChildID);
		var container = document.getElementById(ParentID);
		d.appendTo(container);
	};  /* function CreateDiv(ParentID, ChildID) */

	function SendExpDataDB(call){
		
		clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ BROW: '+browsInfo;

		$.ajax({
			type: 'POST',
			async: true,
			url: 'InsertExpDetails.php',
			
    		data: {expID: ExpID, id: SubID, exp: ExpName, browser: browsInfo},

			success: function(r) {
				clog = 'experiment_data $ '+clog+' $ dbcall success \n';
				log+= clog;
				InsertLog(0,'exp');
				/*alert(r);*/

				if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
					SendExpDataDB(call+1);
				}
			},
			error: function(xhr,textStatus,err)
			{
			},
		});
	} /* function SendExpDataDB(call) */

	function InsertLog(call,ext){

		/*tosend: ID, questionnaire, question, answer*/

		$.ajax({
			type: 'POST',
			data: {expID: ExpID, id: SubID, exp: ExpName, log:log, ext:ext},
			async: true,
			url: 'InsertLog.php',
			error: function(XMLHttpRequest, textStatus, errorThrown) {
				clog='insertlog failure call '+call+' - status: '+textStatus+' - error: '+errorThrown+'\n';
				log+=clog;
				msg ="Internet connection";
				if(Language=='en'){
					msg ="Please verify your internet connection before continuing the experiment";
				} else if(Language=='fr'){
					msg="Veuillez vérifier votre connexion internet avant de continuer";
				}

				InsertLog(call+1,ext);
			}
		});
	} /* function InsertLog(call,ext) */

	function shuffle(array) {
		let counter = array.length;

		/* While there are elements in the array */
		while (counter > 0) {
			/* Pick a random index */
			let index = Math.floor(Math.random() * counter);

			/* Decrease counter by 1 */
			counter--;

			/* And swap the last element with it */
			let temp = array[counter];
			array[counter] = array[index];
			array[index] = temp;
		}

		return array;
	}; /* function shuffle(array) */

	function shuffleByCond(array,ntrial) {

		var postcond = [];
		var arrayMix = [];
		let i=0;

		for (var c=0; c<array.length; c=c+array.length/ntrial){

			postcond[i] = array.slice(c, c+array.length/ntrial);
			i++;
			
		} 

		postcond = shuffle(postcond);

		for (var c=0; c<ntrial; c++){ 

			for(i=0; i<array.length/ntrial; i++){

				arrayMix.push(postcond[c][i]);
			}
		} 

		return arrayMix;
	}; /* function shuffleByCond(array,ntrial) */

	function ProbaMag(cond,o){

		var P    = cond[0][o];
		var Mean = cond[1][o][0];
		var Var  = cond[1][o][1];
		var Val  = cond[2];
		var Info = cond[3];

		return [P,Mean,Var,Val,Info];
	} /* function ProbaMag(cond,o) */

	Math.randomGaussian = function(mean, standardDeviation) {

		/*mean = defaultTo(mean, 0.0);
		standardDeviation = defaultTo(standardDeviation, 1.0);*/

		var continuous_reward;

		if (Math.randomGaussian.nextGaussian !== undefined) {
			var nextGaussian = Math.randomGaussian.nextGaussian;
			delete Math.randomGaussian.nextGaussian;
			continuous_reward = Math.round((nextGaussian * standardDeviation) + mean);
		} else {
			var v1, v2, s, multiplier;
			do {
	            v1 = 2 * Math.random() - 1; // between -1 and 1
	            v2 = 2 * Math.random() - 1; // between -1 and 1
	            s = v1 * v1 + v2 * v2;
	        } while (s >= 1 || s == 0);
	        multiplier = Math.sqrt(-2 * Math.log(s) / s);
	        Math.randomGaussian.nextGaussian = v2 * multiplier;
	        continuous_reward = Math.round((v1 * multiplier * standardDeviation) + mean);	        
	    }
	    if (continuous_reward > 99){
	    	continuous_reward = 99;
	    } else if (continuous_reward < 1) {
	    	continuous_reward = 1;
	    }
	    return continuous_reward;
	};

});


