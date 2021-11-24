$(document).ready(function() {

	/*Initial Experiment Parameters*/
	var ExpName = 'Online_3options_v1';	    /* name of the experiment */
	var Language = "en";					/* langage of the instructions and questionnaire */
	var CompLink = 1;						/* display link at the end of the task? */
	var NumSessions = 1;					/* number of learning sessions */
	var MaxTrainingSessions = 3;			/* maximum number of training sessions */
	var TrainingThreshold   = 0.6;			/* performance threshold for the training test (if not, set to 0) */
	var Transfer  	  = 1;					/* add a transfer test? */
	var Questionnaire = 0;					/* add a questionnaire? */

	var NbTrainingTrials     = 6;			/* number of trials in each condition of the training */
	var TrialsPerCondition   = 45;			/* number of trials in each condition of each learning session */
	var	NbTransferTrials 	 = 2;			/* number of trials in each condition of the transfer test (or pair comparisons) */
	var	NbExplicitTrials 	 = 4;			/* number of trials in each condition of the transfer test (or pair comparisons) */
	
	var TransferFeedback = 0;				/* add feedback in the transfer test? 0 = No, 1 = Partial, 2 = Complete */
	var InterLeaved_Learning = 1;			/* interleaved trials in the learning test? */
	var InterLeaved_Transfer = 1;			/* interleaved trials in the transfer test? */

	var version = 1;						/* task version 1=transfer-explicit, 2=explicit-transfer */

	var online = 0;							/* send the data to the sql database using php? */


	/* Define all the different conditions for all the different sessions (repeat condition if several sessions)
	1 line = 1 condition
	first  = probability of reward for each symbol of the condition: p(reward) = 1-p(punishment)
	second = mean and variance for each symbol of the condition 
	third  = valence of the reward. 1 = positive, -1 = negative, 0 = both 
	fourth = feedback information for all symbols of the condition. 0 = Partial, 1 = Complete */

	var Conditions = [[[1,1,1],[[86,4],[50,4],[14,4]], 1, 1,], 
					  [[1,1],[[86,4],[14,4]], 1, 1,],
					  [[1,1,1],[[86,4],[68,4],[50,4]], 1, 1,], 
					  [[1,1],[[86,4],[50,4]], 1, 1,],];

	/* Define the conditions needed in the training */
	var TrainingConditions = shuffle(Conditions.slice(0,2));


	/* Define the different questionnaires you want if Questionnaire = 1 */
	var WhichQuestionnaires = [];
	WhichQuestionnaires = shuffle(WhichQuestionnaires);


	/* /////////// END OF SET UP ////////// */


	/* Duration of the feedback on the screen */
	var fb_dur = 2500;
	var fb3_dur = 1000;	
	var fbpost_dur = 2000;
	var border_color = "transparent";


	/* Retrieve the symbol pictures and define the options */
	var IMGPath = 'images/cards_gif/';
	var NbIMG = 20;
	var IMGExt = 'gif';
	var images=[];
	var available_options = [];
	for (var i = 1; i <= NbIMG; i++){
		/* available options does not count training pictures (A-E) */
		if (i<=NbIMG-5)	available_options.push(i);
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

	// LEARNING
	var AllOptions = [];
	var AllOptionValues = [];
	var AllOptionsOrder = [];
	var Options = [];
	var j=0;

	for (var i=0;i<NumCond;i++){

		Options[i] = [available_options[j]];
		AllOptions.push(available_options[j])
		AllOptionsOrder.push(j);
		j++;

		for(s=0; s<Conditions[i][0].length; s++){
			AllOptionValues.push([Conditions[i][0][s],Conditions[i][1][s][0],Conditions[i][1][s][1],Conditions[i][2],Conditions[i][3]]);
		}

		while (Options[i].length < Conditions[i][0].length) {
			Options[i].push(available_options[j]);
			AllOptions.push(available_options[j]);
			AllOptionsOrder.push(j);
			j++;
		} 
	}
	
	/* Construction of the Training Test */
	/* Careful: we need to use slice() to create a shallow copy of the array. If not, modifying the copy will modify the original array. */

	var TrainingOptions=[];
	var TrainingOptionValues=[];
	var TrainingOptionsOrder=[];
	var TrainingOptionsCond=[];

	var ct = 0;

	for (var i=0; i<NumTrainingCond; i++){

		for (var t=0; t<NbTrainingTrials; t++){

			TrainingOptions[t + i*NbTrainingTrials]=[];
			TrainingOptionValues[t + i*NbTrainingTrials]=[];
			TrainingOptionsOrder[t + i*NbTrainingTrials]=[];
			TrainingOptionsCond[t + i*NbTrainingTrials]=[];
			
			for (var j=0; j<Conditions[i][0].length; j++){
				TrainingOptions[t + i*NbTrainingTrials].push(available_options[AllOptions.length + j + ct]);
				TrainingOptionValues[t + i*NbTrainingTrials].push(AllOptionValues[j + ct].slice(0));	
				TrainingOptionsOrder[t + i*NbTrainingTrials].push(AllOptionsOrder[j + ct]);	
			}

			TrainingOptionsCond[t + i*NbTrainingTrials].push(i+1);	
		}

		ct = ct+j;
	}

	/* Here we make the training test deterministic. Participants do it until they perfom above 60% of correct response rate */
	for (var i=0; i<TrainingOptionValues.length; i++){
		for (var s=0; s<TrainingOptionValues[i].length; s++){
			TrainingOptionValues[i][s][0] = Math.round(TrainingOptionValues[i][s][0]);
		}
	}

	/* Assign fixed images 1-E to training options (uncomment if not wanted) */
	// var TrainingOptions = [shuffle([16,17,18]),shuffle([19,20])];

	/* Construction of the Learning Test */
	/* First we create vector with all trials, and then we randomize it. */

	var LOptions      = [];
	var LOptionValues = [];
	var LOptionsOrder = [];
	var LOptionsCond  = [];
	var indexes       = [];
	var k = 0;

	var ct = 0;

	for (var i=0; i<Conditions.length; i++){

		for (var t=0; t<TrialsPerCondition; t++){

			LOptions[t + i*TrialsPerCondition]=[];
			LOptionValues[t + i*TrialsPerCondition]=[];
			LOptionsOrder[t + i*TrialsPerCondition]=[];
			LOptionsCond[t + i*TrialsPerCondition]=[];
			
			for (var j=0; j<Conditions[i][0].length; j++){
				LOptions[t + i*TrialsPerCondition].push(AllOptions[j + ct]);
				LOptionValues[t + i*TrialsPerCondition].push(AllOptionValues[j + ct].slice(0));	
				LOptionsOrder[t + i*TrialsPerCondition].push(AllOptionsOrder[j + ct]);
			}

			LOptionsCond[t + i*TrialsPerCondition].push(i+1);
			indexes.push(k);
			k++;
		}

		ct = ct+j;
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
		for(var i = NumTrials * (NumSessions-1); i<AllOptions.length/NumSessions; i++){
			for(var j = NumTrials * (NumSessions-1); j<AllOptions.length/NumSessions; j++){
				if (i!=j){
					TOptions.push([AllOptions[i],AllOptions[j]]);
					TOptionValues.push([AllOptionValues[i].slice(0),AllOptionValues[j].slice(0)]);
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



	/* Randomize the Options vector for the explicit slider phase */

	var ExplicitOptions = [];
	var ExplicitOptionValues = [];
	var ExplicitOptionsOrder = [];

	var ExplicitIndex = [];

	for(var i=0; i<NbExplicitTrials; i++){
		for(var j=0; j<AllOptionsOrder.length; j++){
			ExplicitIndex.push(AllOptionsOrder[j]);
		}	
	}

	shuffle(ExplicitIndex);

	for(var i=0; i<ExplicitIndex.length; i++){
		ExplicitOptions.push(AllOptions[ExplicitIndex[i]]);
		ExplicitOptionValues.push(AllOptionValues[ExplicitIndex[i]]);
		ExplicitOptionsOrder.push(AllOptionsOrder[ExplicitIndex[i]]);
	}

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

	var link = '';

	/* /////////// THE EXPERIMENT STARTS HERE ////////// */

	GetUserID();
	//Instructions(5);
	//PlayLearning(0,175,2);
	//ExplicitTest(0);
	//StartTransfer(1);


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

		var NumPages = 6;/*number of pages*/

		CreateDiv('Stage', 'TextBoxDiv');

		var Title = '<H2 align = "center">Instructions<br><br></H2>';

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
				var Info = '<H4 align = "center">This experiment consists in performing a cognitive test composed of 3 phases.<br><br>'+
					'Your final payoff will depend on your choices. '+
					'You can maximize your payoff by finding out which option makes you win more points.<br><br>'+
					'For each choice you make, you will see the number of points you won by choosing one option, and the number of points you would have won by choosing the others options.<br><br>'+
					'At the end of the experiment, we will calculate the cumulated sum of the points you won and translate the score into real money according to the following rule.<br><br>'+
					'Please note that ONLY the points of the chosen option will count for the final payoff.<br><br></H4>';}
			break;

			case 2:
			if(Language=='en'){
				var Info = '<H3 align = "center">After a choice, you can receive outcomes in this range:<br><br>'+
					'0 point = 0 pence<br>100 points = 2 pence<br><br>'+
					'Across the 3 phases of the cognitive experiment, <br>you can win a total (fixed payment + bonus) up to 33016 points = 6.6 pounds.<br><br>'+
					'You can\'t win less than the fixed payment.<br><br></H3>';
			}
			break;

			case 3:
			if(Language=='en'){
				var Info = '<H3 align = "center">At each trial, you must choose between 2 or 3 abstract pictures by clicking on a picture.<br><br>'+
					'The crucial point is that, on average, one picture is more advantageous than the others in terms of points to be won. '+
					'The pictures\' position (left/middle/right) does not matter.<br><br>'+
					'You can maximize the final payoff by choosing at each trial the pictures with the highest average value. <br><br></H3>';
			}
			break;

			case 4:
			if(Language=='en'){
				var Info = '<H3 align = "center">In the first phase, you will be informed about the result of your choices on each trial.<br><br>'+
					'In the second and third phase, you will be informed about the results of your choices only at the end of the experiment.<br><br>'+
					'All phases of the cognitive test will use the same pictures and they will keep the same value all phases.<br><br></H3>';
			}
			break;

			case 5:
			if(Language=='en'){
				var Info  = '<H4 align = "center"> Please answer the following questions.<br>'+
				'(note, you will be redirected to the instructions if you do not respond correctly to all questions).</H4>'+

				'<div class="row"><div class="col-xs-2 col-md-2"></div><div id = "Middle" class="col-xs-8 col-md-8"><H4>'+
				'-	your final payoff will depend on your choices during the cognitive test:'+
				'</h4></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-2 col-md-2"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="100" name= "answer1" value= 1> <label for="100"> True </label><br>' +
				'<input type= "radio" id="000" name= "answer1" value= 0> <label for="000"> False  </label><br><br>' +
				'</div><div class="col-xs-2 col-md-2"></div></div>'+

				'<div class="row"><div class="col-xs-2 col-md-2"></div><div id = "Middle" class="col-xs-8 col-md-8"><H4>'+
				'-	in the second and third phases of the test you will know the results of your choices on each trial:'+
				'</h4></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-2 col-md-2"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="00" name= "answer2" value= 0> <label for="00"> True </label><br>' +
				'<input type= "radio" id="10" name= "answer2" value= 1> <label for="10"> False  </label><br><br>' +
				'</div><div class="col-xs-2 col-md-2"></div></div>'+

				'<div class="row"><div class="col-xs-2 col-md-2"></div><div id = "Middle" class="col-xs-8 col-md-8"><H4>'+
				'-	the position where a picture appears determines its value:'+
				'</h4></div><div class="col-xs-1 col-md-1"></div></div>'+
				'<div class="row"><div class="col-xs-2 col-md-2"></div><div id = "Middle" class="col-xs-7 col-md-7">' +
				'<input type= "radio" id="0" name= "answer3" value= 0> <label for="0"> True </label><br>' +
				'<input type= "radio" id="1" name= "answer3" value= 1> <label for="1"> False  </label><br><br><br><br>' +
				'</div><div class="col-xs-2 col-md-2"></div></div>';
			}
			break;

			case 6:
			if(Language=='en'){
				var Info = '<H3 align = "center">Let\'s begin with a training!<br><br>'+
				'Please note that points won during the training do not count for the final payoff '+
				'and that the training will be re-iterated until you reach a threshold of '+ parseInt(TrainingThreshold*100) +'% of correct responses.  <br><br></H3>';
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
			var Cond          = TrainingOptionsCond[TrialNum][0];
			var Symbols       = [];
			for(var i=0; i<TrainingOptionsOrder[TrialNum].length; i++){
				Symbols.push(TrainingOptionsOrder[TrialNum][i]);
			}

		} else if(Phase==1) {

			var Option        = Sessions[SessionNum][TrialNum][0];	
			var SymbolOptions = Sessions[SessionNum][TrialNum][1];
			var Cond          = Sessions[SessionNum][TrialNum][3][0];
			var Symbols       = [];
			for(var i=0; i<Sessions[SessionNum][TrialNum][2].length; i++){
				Symbols.push(Sessions[SessionNum][TrialNum][2][i]);
			}

		} else if(Phase==2){

			var Option        = TransferOptions[TrialNum];	
			var SymbolOptions = TransferOptionValues[TrialNum];
			var Cond          = 0;
			var Symbols       = [];
			for(var i=0; i<TransferOptionsOrder[TrialNum].length; i++){
				Symbols.push(TransferOptionsOrder[TrialNum][i]);
			}
		}

		/* Affect the pictures to each Option */

		var Option1 = images[Option[0]];
		Option1.id = "Option1";
		Option1 = Option1.outerHTML;

		var Option2 = images[Option[1]];
		Option2.id = 'Option2';
		Option2 = Option2.outerHTML;

		var Option3=[];
		var canvas3=[];

		if(Language=='en'){
			var Title = '<div id = "Title"><H6 align = "center"> <br><br><br><br></H6></div>';
		}
		else if(Language=='fr'){
			var Title = '<div id = "Title"><H6 align = "center"> <br><br><br><br></H6></div>';
		}

		var Count = '<div id = "Count"><H3 align = "center">Your current amount: '+ parseInt(SumReward)/1000 +' points<br><br><br><br></H3></div>';

		/* Create canevas for the slot machine effect, of the size of the images */

		var canvas1 = '<canvas id="canvas1" height="600" width="600" class="img-responsive center-block" style="border: 6px solid transparent; transform: translate(0%, -100%); position: relative; top: 0px;"></canvas>';
		var canvas2 = '<canvas id="canvas2" height="600" width="600" class="img-responsive center-block" style="border: 6px solid transparent; transform: translate(0%, -100%); position: relative; top: 0px;"></canvas>';

		if (Option.length==3){
			Option3 = images[Option[2]];
			Option3.id = "Option3";
			Option3 = Option3.outerHTML;
			canvas3 = '<canvas id="canvas3" height="600" width="600" class="img-responsive center-block" style="border: 6px solid transparent; transform: translate(0%, -100%); position: relative; top: 0px;"></canvas>';
		}

		var random_Options = [Option1, Option2, Option3];
		var random_Canvas = [canvas1, canvas2, canvas3];

		var random_placement = shuffle([0,1,2]);
		var random_Symbols=[];

		for (var i = 0; i < random_placement.length; i++) {
			random_Symbols.push(Symbols[random_placement[i]]);
		}

		var myCanvas  = '<div id = "cvrow" class="row row-centered" style= "transform: translate(0%, 0%);position:relative">' +
			' <div class="col-xs-3 col-md-3 col-centered">' + random_Options[random_placement[0]] + random_Canvas[random_placement[0]] + '</div>' +
			' <div class="col-xs-1 col-md-1 col-centered"></div>' +
			' <div class="col-xs-3 col-md-3 col-centered">' + random_Options[random_placement[1]] + random_Canvas[random_placement[1]] + '</div>' +
			' <div class="col-xs-1 col-md-1 col-centered"></div>' +
			' <div class="col-xs-3 col-md-3 col-centered">' + random_Options[random_placement[2]] + random_Canvas[random_placement[2]] + '</div></div>';

		/* myCanvas is a superposition of the symbol pictures and the interactive canvas */

		$('#TextBoxDiv').html(Title + myCanvas);

		var Choice_time = (new Date()).getTime();

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

		$('#canvas3').click(function() {
			if(clickDisabeled)
				return;
			clickDisabeled = true;
			fb = Reward(3);
			document.getElementById("canvas3").style.borderColor="black";          
		});

		function Reward(Choice) {

			var Reaction_time = (new Date()).getTime();

			var left_middle_right = -1;
			if(Choice==random_placement[1]+1) {
				left_middle_right = 0;
			} else if(Choice==random_placement[2]+1) {
				left_middle_right = 1;
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
					Rwd[i] =  randomGaussian(Mean[i],Var[i]);
					Pun[i] = 0;
				}else if (Val[i]<0){
					Rwd[i] = 0;
					Pun[i] = -randomGaussian(Mean[i],Var[i]);
				}else if (Val[i]==0){
					Rwd[i] =  randomGaussian(Mean[i],Var[i]);
					Pun[i] = -randomGaussian(Mean[i],Var[i]);
				}
			}

			if (OptionValues[0]==OptionValues[1]){
				goodchoice = -1;
			} else if ( ((Math.max(...OptionValues)==OptionValues[0]) && (Choice==1))
				|| ((Math.max(...OptionValues)==OptionValues[1]) && (Choice==2))
				|| ((Math.max(...OptionValues)==OptionValues[2]) && (Choice==3))){

				goodchoice = 1;
			} else {
				goodchoice = 0;
			}

			SumGoodResp = SumGoodResp + (goodchoice+1)/2;


			if (Choice === 1) {	

				var ThisReward  = Pun[0];
				var OtherReward1 = Pun[0];
				var OtherReward2 = NaN;

				if (Math.random() <= P[0]) {
					ThisReward = Rwd[0];
				}
				if (Math.random() <= P[1]) {
					OtherReward1 = Rwd[1];
				}
				if (Math.random() <= P[2]) {
					OtherReward2 = Rwd[2];
				}

			} else if (Choice === 2) {	

				var ThisReward  = Pun[1];
				var OtherReward1 = Pun[1];
				var OtherReward2 = Pun[1];

				if (Math.random() <= P[1]) {
					ThisReward = Rwd[1];
				}
				if (Math.random() <= P[0]) {
					OtherReward1 = Rwd[0];
				}
				if (Math.random() <= P[2]) {
					OtherReward2 = Rwd[2];
				}
			} else if (Choice === 3	) {	

				var ThisReward  = Pun[2];
				var OtherReward1 = Pun[2];
				var OtherReward2 = Pun[2];

				if (Math.random() <= P[2]) {
					ThisReward = Rwd[2];
				}
				if (Math.random() <= P[0]) {
					OtherReward1 = Rwd[0];
				}
				if (Math.random() <= P[1]) {
					OtherReward2 = Rwd[1];
				}
			}

			SumReward = SumReward + 1000* ThisReward;

			var pic1 = document.getElementById("Option1");
			var pic2 = document.getElementById("Option2");
			var pic3 = document.getElementById("Option3");

			var cv1 = document.getElementById("canvas1");
			var cv2 = document.getElementById("canvas2");
			var cv3 = document.getElementById("canvas3");

			if (Phase != 2) {

				if(Choice==1){

					setTimeout(function() {

						slideCard(pic1,cv1, ThisReward);

						if(Info[0]===1){
							cv2.style.border="6px solid transparent";
							slideCard(pic2,cv2, OtherReward1);
							if (cv3) {
								cv3.style.border="6px solid transparent";
								slideCard(pic3,cv3, OtherReward2);
							}
						}
					}, 500)

				}else if(Choice==2){

					setTimeout(function() {

						slideCard(pic2,cv2, ThisReward);

						if(Info[1]===1){
							cv1.style.border="6px solid transparent";
							slideCard(pic1,cv1, OtherReward1);
							if (cv3) {
								cv3.style.border="6px solid transparent";
								slideCard(pic3,cv3, OtherReward2);
							}
						}
					}, 500)

				}else if(Choice==3){

					setTimeout(function() {

						slideCard(pic3,cv3, ThisReward);

						if(Info[1]===1){
							cv1.style.border="6px solid transparent";
							slideCard(pic1,cv1, OtherReward1);
							cv2.style.border="6px solid transparent";
							slideCard(pic2,cv2, OtherReward2);
						}
					}, 500)
				}

			} else if (Phase == 2) {

				if (TransferFeedback != 0){

					if(Choice==1){

						setTimeout(function() {

							slideCard(pic1,cv1, ThisReward);

							if(TransferFeedback == 2){
								cv2.style.border="6px solid transparent";
								slideCard(pic2,cv2, OtherReward);
								if (cv3) {
									cv3.style.border="6px solid transparent";
									slideCard(pic3,cv3, OtherReward2);
								}
							}
						}, 500)

					}else if(Choice==2){

						setTimeout(function() {

							slideCard(pic2,cv2, ThisReward);

							if(TransferFeedback == 2){
								cv1.style.border="6px solid transparent";
								slideCard(pic1,cv1, OtherReward1);
								if (cv3) {
									cv3.style.border="6px solid transparent";
									slideCard(pic3,cv3, OtherReward2);
								}
							}
						}, 500)

					}else if(Choice==3){

						setTimeout(function() {

							slideCard(pic3,cv3, ThisReward);

							if(TransferFeedback == 2){
								cv1.style.border="6px solid transparent";
								slideCard(pic1,cv1, OtherReward1);
								cv2.style.border="6px solid transparent";
								slideCard(pic2,cv2, OtherReward2);
							}
						}, 500)
					}
				} else { /* Roll to "???" (no feedback) for both options */

					setTimeout(function() {

						slideCard(pic1,cv1,'?');
						slideCard(pic2,cv2,'?');
						if(Choice==1){
							cv2.style.border="6px solid transparent";
						}else if(Choice==2){
							cv1.style.border="6px solid transparent";						
						}
					}, 500)
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

						ctx.lineWidth = 3;
						ctx.strokeStyle="black";
						ctx.strokeRect(0, 0, canvas.width, canvas.height);

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

	    		clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ TEST: '+ Phase +' $ TRIAL: '+TrialNum+' $ COND: '+Cond+
	    			' $ SYML: '+random_Symbols[random_placement[0]]+' $ SYMM: '+random_Symbols[random_placement[1]]+' $ SYMR: '+random_Symbols[random_placement[2]]+
	    			' $ CLMR: '+left_middle_right+' $ CGB: '+((goodchoice == 1)?1:0)+' $ RGB: '+ThisReward+' $ CFGB1: '+OtherReward1+' $ CFGB2: '+OtherReward2+
	    			' $ RTIME: '+(Reaction_time-Choice_time)+ '$ REW: '+parseInt(SumReward)/1000+' $ SESSION: '+SessionNum+
	    			' $ P1: '+P[random_placement[0]]+' $ P2: '+P[random_placement[1]]+' $ P3: '+P[random_placement[2]]+
	    			' $ MEAN1: '+Mean[random_placement[0]]+' $ MEAN2: '+Mean[random_placement[1]]+' $ MEAN3: '+Mean[random_placement[2]]+
	    			' $ VAR1: '+Var[random_placement[0]]+' $ VAR2: '+Var[random_placement[1]]+' $ VAR3: '+Var[random_placement[2]]+
	    			' $ VAL1: '+Val[random_placement[0]]+' $ VAL2: '+Val[random_placement[1]]+' $ VAL3: '+Val[random_placement[2]]+
	    			' $ INF1: '+Info[random_placement[0]]+' $ INF2: '+Info[random_placement[1]]+' $ INF3: '+Info[random_placement[2]]+
	    			' $ OP1: '+Option[random_placement[0]]+' $ OP2: '+Option[random_placement[1]]+' $ OP3: '+Option[random_placement[2]]+
	    			' $ V1: '+OptionValues[random_placement[0]]+' $ V2: '+OptionValues[random_placement[1]]+' $ V3: '+OptionValues[random_placement[2]]+' $ CTIME: '+(Choice_time-Init_time);

	    		// console.log(clog)
	    		
	    		$.ajax({
	    			type: 'POST',
	    			data: {exp: ExpName, expID: ExpID, id: SubID, test: Phase, trial: TrialNum, condition:Cond,
	    				symL:Symbols[random_placement[0]], symM:Symbols[random_placement[1]], symR:Symbols[random_placement[2]],
		    			choice_left_middle_right:left_middle_right, choice_good_bad:((goodchoice == 1)?1:0), reward_good_bad:ThisReward, other_reward_good_bad1:OtherReward1, other_reward_good_bad2:OtherReward2,
		    			reaction_time:Reaction_time-Choice_time, reward: parseInt(SumReward)/1000, session: SessionNum,
		    			p1:P[random_placement[0]], p2:P[random_placement[1]], p3:P[random_placement[2]],
		    			mean1:Mean[random_placement[0]], mean2:Mean[random_placement[1]], mean3:Mean[random_placement[2]],
		    			variance1:Var[random_placement[0]], variance2:Var[random_placement[1]], variance3:Var[random_placement[2]],
		    			valence1:Val[random_placement[0]], valence2:Val[random_placement[1]], valence3:Val[random_placement[2]],
		    			information1:Info[random_placement[0]], information2:Info[random_placement[1]], information3:Info[random_placement[2]],
		    			option1:Option[random_placement[0]], option2:Option[random_placement[1]], option3:Option[random_placement[2]],
		    			v1:OptionValues[random_placement[0]], v2:OptionValues[random_placement[1]], v3:OptionValues[random_placement[2]], choice_time:Choice_time-Init_time},
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
		    		}, fb_dur + fb3_dur*(Symbols.length==3));
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
		    		}, fb_dur + fb3_dur*(Symbols.length==3));
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
		    		}, fb_dur + fb3_dur*(Symbols.length==3));

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
		    		}, fb_dur + fb3_dur*(Symbols.length==3));
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
							if(version==1){
								StartExplicit(1);
							}else if(version==2){
								EndExperiment();
							}
						}, 500);
					}, fbpost_dur);
				}
		    }
	    } /* function Next() */
	};  /* function PlayLearning(SessionNum,TrialNum,Phase) */

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
	} /* function ReTraining() */

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
				if(version==1){
					StartTransfer(1);
				}else if(version==2){
					StartExplicit(1);
				}
			}else if(Questionnaire){
				PlayAllQuestionnaires();
			}else{
				TotalReward= SumReward;
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
			if(version==1){
				var Title = '<H3 align = "center">PHASE 2</H3>';
			} else if(version==2){
				var Title = '<H3 align = "center">PHASE 3</H3>';
			}
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
				var Info = '<H3 align="center"><br>You have finished this phase of the cognitive experiment.<br> So far you have '+wonlost+toprint+' points!<br></h3><br><br>';
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
				var Info = '<H3 align="center">You are about to start the next phase of the task.<br><br>'+
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
					//StartReasoningTest();
				}else{
					if(version==1){
						StartExplicit(1);
					}else if(version==2){
						EndExperiment();
					}
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

	function StartExplicit(PageNum) { /*text to uncomment for information*/

		var NumPages = 3;
		var toprint = parseInt(SumReward)/1000;

		CreateDiv('Stage', 'TextBoxDiv');

		if(Language=='en'){
			if(version==1){
				var Title = '<H3 align = "center">PHASE 3</H3>';
			} else if(version==2){
				var Title = '<H3 align = "center">PHASE 2</H3>';
			}

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
				var Info = '<H3 align="center"><br>You have finished this phase of the cognitive experiment.<br> So far you have '+wonlost+toprint+' points!<br></h3><br><br>';
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
				var Info = '<H3 align="center">You are about to start the next phase of the task.<br><br>'+
					'You will be choosing how much you value each picture that was presented to you.<br><br>'+
					'Please move the slider to the average value of each picture. <br><br> You will be rewarded for your answers.<br>'+
					'The closer you are to the true value, the more points you will gain, within a limit of 100 points per answer.<br><br></h3>';
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
			StartExplicit(PageNum - 1);
		});

		$('#Next').click(function() {

			$('#TextBoxDiv').remove();
			$('#Stage').empty();
			$('#Bottom').empty();
			StartExplicit(PageNum + 1);

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
									ExplicitTest(0);
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
									ExplicitTest(0);
							}, 1000);
						}, 1000);
					}, 1000);
				}, 10);
			}
		});
	};  /* function StartExplicit(PageNum) */

	function ExplicitTest(TrialNum){

		if($('#TextBoxDiv').length == 0){
			CreateDiv('Stage', 'TextBoxDiv');
		}	

		var Option        = ExplicitOptionsOrder[TrialNum];	
		var SymbolOptions = ExplicitOptions[TrialNum];
		var ValueOptions  = ExplicitOptionValues[TrialNum][1];

		/* Affect the picture to the Option */

		var Option1 = images[SymbolOptions];
		Option1.id = "Option1";
		Option1 = Option1.outerHTML;

		if(Language=='en'){
			var Title = '<div id = "Title"><H3 align = "center"><br> What was the average value of this picture? <br><br></H3></div>';
		}
		else if(Language=='fr'){
			var Title = '<div id = "Title"><H6 align = "center"> <br><br><br><br></H6></div>';
		}

		var Picture  = '<div id="picture" class="img-responsive center-block" style= "height:300; width:300; transform: translate(0%, 0%);position:relative">'+ Option1 +'</div></div>';

		var Slider = '<H3 align="center"><br><div id="slider" class="range"><div class="sliderValue"><span> 100 </span></div>'+
		    '<div class="field"><div class="value left"> 0 </div><input type="range" min="0" max="100" value="50" steps="1"><div class="value right"> 100 </div></div></div></H3><br>';

		var select=0;

		$('#TextBoxDiv').html(Title + Picture + Slider);

		var Choice_time = (new Date()).getTime();

		const slideValue = document.querySelector("span");
    	const inputSlider = document.querySelector("input");
    	inputSlider.oninput = (()=>{
     		let value = inputSlider.value;
        	slideValue.textContent = value;
        	slideValue.style.left = (value*93/100 +4) + "%";
        	slideValue.classList.add("show");
        	select=1;
    	});
    	inputSlider.onblur = (()=>{
    		slideValue.classList.remove("show");
    	});


		if(Language=='en'){
			var Buttons = '<div align="center"><input align="center" type="button"  class="btn btn-default" id="Submit" value="Submit" ></div>';
		}

		$('#Bottom').html(Buttons);

		$('#Submit').click(function() {

			if (select==0) {
				alert('Please select a value.');

			} else {

				Reaction_time = (new Date()).getTime();

				ThisReward = 100 - Math.abs(1000*inputSlider.value/1000 - ValueOptions);
				SumReward = SumReward + ThisReward*1000;

				if(online==1) SendExplicitDataDB(0);

		    	function SendExplicitDataDB(call){

		    		clog = 'EXP: '+ExpName+' $ EXPID: '+ExpID+' $ ID: '+SubID+' $ TEST: '+ 3 +' $ TRIAL: '+TrialNum+
		    			' $ OPT: '+Option+' $ ANSWER: '+inputSlider.value+' $ VALUE: '+ValueOptions+'$ REWARD: '+ThisReward+'$ SUMREWARD: '+parseInt(SumReward)/1000+
		    			' $ SYM: '+SymbolOptions+' $ RTIME: '+(Reaction_time-Choice_time)+' $ CTIME: '+(Choice_time-Init_time);

		    		// console.log(clog)
		    		
		    		$.ajax({
		    			type: 'POST',
		    			data: {exp: ExpName, expID: ExpID, id: SubID, test: 3, trial: TrialNum,
		    				opt:Option, answer:inputSlider.value, value:ValueOptions, reward:ThisReward, sumreward:parseInt(SumReward)/1000,
		    				sym:SymbolOptions, reaction_time:Reaction_time-Choice_time, choice_time:Choice_time-Init_time},
		    			async: true,
		    			url: 'InsertExplicitDataDB.php',

		    			success: function(r) {
		    				clog = 'explicit_data $ '+clog+' $ dbcall success \n';
		    				log+= clog; 

		    				if (r[0].ErrorNo > 0 && call+1<maxDBCalls){
		    					SendExplicitDataDB(call+1);
		    				}
		    			},
		    			error: function(XMLHttpRequest, textStatus, errorThrown) {
		    				clog = 'explicit_data $ '+clog+' $ dbcall failure \n';
		    				log+=clog;

		    				alert(errorThrown.responseText)

		    				if(call+1<maxDBCalls){
		    					SendExplicitDataDB(call+1);
		    				}
		    			}
		    		});
		    	};  /* function SendExplicitDataDB(call) */

				TrialNum++;

				if (TrialNum < ExplicitOptions.length) {
				
					$('#picture').fadeOut(500);
					$('#slider').fadeOut(500);

					setTimeout(function() {
						
						clickDisabeled=false;

							ExplicitTest(TrialNum);

					}, 500);
						
				} else {
							
					$('#TextBoxDiv').remove();
					$('#Stage').empty();
					$('#Bottom').empty();

					setTimeout(function() {

						if(version==1){
							EndExperiment();
						}else if(version==2){
							StartTransfer(1);
						}
					}, 500);
				}	
			}		
		});
	}

	function EndExperiment() {

		CreateDiv('Stage', 'TextBoxDiv');

		TotalReward= TotalReward+SumReward;

		SumReward = 0;

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
				'You '+wonlost+toprint+' points in total, which is a total of '+toprint/5000+' pounds.<br><br>Thank you for playing!<br><br>Please click the link to complete this study:<br></h3><br>';
			var url = '';
			if (CompLink)
				url = '<center><a href="'+link+'">Click here.</a></center>';
		} else if(Language=='fr'){
			var Title = '<h3 align = "center">L\'expérience est terminée !<br>'+
				'Vous avez '+wonlost+toprint+' points au total, ce qui correspond à '+toprint/5000+' euros de bonus.<br><br>Merci de votre participation !<br><br>Cliquez sur ce lien pour compléter l\'étude :<br></h3><br>';
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

	function randomGaussian(mean, standardDeviation) {

		/*mean = defaultTo(mean, 0.0);
		standardDeviation = defaultTo(standardDeviation, 1.0);*/

		var continuous_reward;

		if (randomGaussian.nextGaussian !== undefined) {
			var nextGaussian = randomGaussian.nextGaussian;
			delete randomGaussian.nextGaussian;
			continuous_reward = Math.round((nextGaussian * standardDeviation) + mean);
		} else {
			var v1, v2, s, multiplier;
			do {
	            v1 = 2 * Math.random() - 1; // between -1 and 1
	            v2 = 2 * Math.random() - 1; // between -1 and 1
	            s = v1 * v1 + v2 * v2;
	        } while (s >= 1 || s == 0);
	        multiplier = Math.sqrt(-2 * Math.log(s) / s);
	        randomGaussian.nextGaussian = v2 * multiplier;
	        continuous_reward = Math.round((v1 * multiplier * standardDeviation) + mean);	        
	    }
	    if (continuous_reward > 99){
	    	continuous_reward = 99;
	    } else if (continuous_reward < 1) {
	    	continuous_reward = 1;
	    }
	    return continuous_reward;
	}; /* function randomGaussian(mean, standardDeviation) */
});


