
$(document).ready(function(){	

	// 긴급 공지사항 유무를 확인하고 뿌려줍니다.
	if ( noticeFind ) showNotice();

	$("#hdStaSubwayMapAll").svg({
        onLoad: function()
            {
            var svg = $("#hdStaSubwayMapAll").svg('get');
            svg.configure({width:1400,height:990},true);
            svg.load('svg/subwayMap.svg', {addTo: true});
            },
        settings: {}}
        );         

	//$('#hdStaSubwayMapAll').smartZoom({"maxScale":3,"dblClickMaxScale":1});
	//$('#hdStaSubwayMapAll').smartZoom("zoom",1);

	// 뒤로가기 버튼을 사용자가 정의하기 위해 차단합니다.
	navigator.app.overrideBackbutton(true);
	
});

$(document).bind("mobileinit", function(){
  //touchOverflowEnabled
  $.mobile.touchOverflowEnabled = true;
});

$(document).on("scroll",function(){

});

$(window).load(function(){

	// 뒤로가기 버튼시 앱을 종료할지 페이지 뒤로 갈지 결정
	document.addEventListener("backbutton", function(){showAppExitConfirm()}, true);
	
});

// 앱 활용 변수 객체
var appVar = {
	posLat : null,
	posLng : null,
	loadedNowPlace : null,
	loadedNowPlaceFull : null,
	watchID : null,
	everlineTable : null,
	ulineTable : null,
	ulineGap : null,
	stationStart : null, // 최단경로 검색의 출발역 코드
	stationEnd : null, // 최단경로 검색의 도착역 코드
	trainPosLine : 1001, // 실시간 열차를 보여줄 노선 코드
	trainPosName : null // 실시간 열차를 보여준 기준역,	
}

// 후다닥 생성
var huddak = {
	dom : {
		headerLoc : $(".headerLoc")
	}

}

// 역 리스트 ng컨트롤러 생성
function TrafficListController($scope, $http, $timeout){

	// 좌표를 찾는 함수
    if(navigator.geolocation){ //브라우저에서 웹 지오로케이션 지원 여부 판단    	
    	var geo_options = {
    		enableHighAccuracy: true,
			maximumAge        : 0,
			timeout           : 8000
    	}
		appVar.watchID = navigator.geolocation.getCurrentPosition(MyPosition,posErr,geo_options);
	}else{
		getDataFail();
		getData();
	}

	function MyPosition(position){
		appVar.posLat= position.coords.latitude;
		appVar.posLng = position.coords.longitude;

		// 지하철 정보를 가져옵니다.
		getData();

		// 현재 위치 지명을 가져옵니다.
		ajaxGoogleLoad();
		
	}

	function posErr(){
		viewCommBox("안드로이드 설정의 위치를 활성화 해주세요");
		getDataFail();
		getData();
	}

	// 주소를 가져오는 함수
	function ajaxGoogleLoad(){
	    $http.get("http://maps.googleapis.com/maps/api/geocode/json?latlng="+appVar.posLat+","+appVar.posLng+"&sensor=true").success(
	    	function(data){
	    		
	    		appVar.loadedNowPlace = data.results[3].formatted_address;
	    		appVar.loadedNowPlaceFull = appVar.loadedNowPlace.replace("한국","").replace("대한민국","").replace("특별시","시").replace("광역시","시");

	    		huddak.dom.headerLoc.html(appVar.loadedNowPlaceFull + " 부근");

	    	}).error(function(){
	        	
	        	// 실패시 메시지 표시
	        	getDataFail();
	        	viewCommBox("지역 정보를 가져오는데 실패했습니다.");

	    	}).finally(function(){
	    		
	    		// 지하철 정보를 가져옵니다.
	    		// getData();
	    		
	    	}
	    );
	}

	// 데이터 로드 실패시 기본값
	function getDataFail(){
		
		huddak.dom.headerLoc.html("위치 추적실패 (서울역 기준)");
		viewCommBox("안드로이드 설정의 위치를 활성화 해주세요");
		appVar.posLat = "37.555107";
		appVar.posLng = "126.970691";

	}

	// 지하철 정보를 가져옵니다.
	function getData(){

		/* jQuery의 ajax 통신과 거의 유사하다. */
		$http.get('json/stationData.json').success(
		function(data)
		{
			$scope.subwayData = data;

			for ( var i = 0 ; i < $scope.subwayData.length ; i++){

				$scope.subwayData[i].distance = computeDistance($scope.subwayData[i].posLat,$scope.subwayData[i].posLng,"km");

			}
			
		}).error(function(){			
			$(".loader-text").css("font-size","16px");
			$(".loader-text").html("Loading...");
			$(".loaders").fadeOut(200);
			viewCommBox("지하철 정보를 가져오지 못했습니다.");
		}).finally(function(){			
			$(".loader-text").css("font-size","16px");
			$(".loader-text").html("Loading...");
			$(".loaders").fadeOut(200);

		});

	}

	$scope.orderProperty = "no";

	// 지하철 정보가 닫혀 있으면 열면서 로드 , 열려있으면 닫기
	$scope.realTimeArrive = function(event,idx,name){			
				
		// 체크후 열려있지 않을때만 실행
		if ( !$(event.target).parent().parent().parent().hasClass("on") ){

			$(event.target).parent().parent().parent().parent().find("li").removeClass("on");
			$(event.target).parent().parent().parent().addClass("on");
			realTimeArriveTrain(event,idx,name);
			
		}else{

			$(event.target).parent().parent().parent().removeClass("on");			

		}
				
	}

	// 지하철 역 정보를 가져 오는 함수
	$scope.showStationData = function(idx){

		$(".loaders").fadeIn(200);
		$loc = $("#hdStaSubwayInfo .infoCon");

		// 해당역의 역명 / 역번호를 뿌립니다.
		$loc.find(".infoStaNum").html('<p class="numIco line'+$scope.subwayData[idx].lineCode+' font_GothamL">'+$scope.subwayData[idx].stationNum+'</p>');			
		$loc.find(".infoStaName").html($scope.subwayData[idx].stationName);
		$loc.find(".infoStaNameEng").html($scope.subwayData[idx].stationNmEng);
		
		// 해당역의 관리 회사 로고 뿌리기
		$loc.find(".info_con1").css({"background":"url("+findOpcomIcon($scope.subwayData[idx].lineMng)+") no-repeat 50% 50%","background-size":"100% 100%"})

		//플랫폼 형태 뿌리기
		if ( $scope.subwayData[idx].platform === "양쪽" ){
			$loc.find(".info_con2").css({"background":"url(img/info_platform_type2.gif) no-repeat 50% 50% #fff","background-size":"100% 100%"});
			$loc.find(".info_con2 span").text("상대식 승강장");
		}else{
			$loc.find(".info_con2").css({"background":"url(img/info_platform_type1.gif) no-repeat 50% 50% #fff","background-size":"100% 100%"});
			$loc.find(".info_con2 span").text("가운데 승강장");
		}

		// 개찴구 내 화장실 여부
		if ( $scope.subwayData[idx].lavatory === "바깥" ){
			$loc.find(".info_con3").css({"background":"url(img/info_lavatory_type2.gif) no-repeat 50% 50% #fff","background-size":"100% 100%"});
			$loc.find(".info_con3 span").text("개찰구 밖 화장실");
		}else{
			$loc.find(".info_con3").css({"background":"url(img/info_lavatory_type1.gif) no-repeat 50% 50% #fff","background-size":"100% 100%"});
			$loc.find(".info_con3 span").text("개찰구 내 화장실");
		}
		
		// 플랫폰간 횡단 가능 여부
		if ( $scope.subwayData[idx].cross === "연결안됨" ){
			$loc.find(".info_con4").css({"background":"url(img/info_cross_type2.gif) no-repeat 50% 50% #fff","background-size":"100% 100%"});
			$loc.find(".info_con4 span").text("횡단불가");
		}else{
			$loc.find(".info_con4").css({"background":"url(img/info_cross_type1.gif) no-repeat 50% 50% #fff","background-size":"100% 100%"});
			$loc.find(".info_con4 span").text("횡단가능");
		}

		// 첫차,막차 정보 가져오기
		lineCode = $scope.subwayData[idx].lineCode;
		// 역번호를 저장합니다
		stationNumber = $scope.subwayData[idx].stationNum;
		
		// 초기화
		$loc.find(".infoMenu li").unbind("click");
		$(".infoStaCon").html("");
		$(".infoStaFirTrain").html("");
		$(".infoStaLstTrain").html("");

		if ( lineCode != "0116" && lineCode != "0119" ){  // 실시간 데이터를 불러오는 코드

			// 기타 역정보가 제공되는 곳에만 메뉴를 보여줍니다.
			$(".infoMenu").css("display","block");

			// 초기화
			tmpLoc = "";
			tmpACode = "";

			// 역번호의 정수부분만 뗍니다
			tmpLoc = stationNumber.replace(/[^\d]/g,"");
			// 역번호의 알파벳만 뗍니다
			tmpACode = stationNumber.replace(/[\d]/g,"");				

			// 역번호에 포함된 알파벳을 아스키 코드로 변환합니다.				
			if ( tmpACode == "-") tmpACode = "";
			if ( tmpACode !== "" ) tmpACode = tmpACode.replace( tmpACode[0] , tmpACode.charCodeAt(0) );
			
			if ( lineCode == "1065" ){ // 예외처리
				stationNumber = String(tmpACode)+String(tmpLoc);
			}else{
				stationNumber = tmpACode+parseInt(tmpLoc,10);	
			}
						
			// 찾은 역번호를 6자리로 만듭니다.				
			if ( stationNumber.length < 6 ) {
					
				tmpLen = stationNumber.length;

				for ( var j = 0 ; j < 6 - tmpLen ; j++ ){
					stationNumber = "0"+stationNumber;						
				}

			}			
					
			//쿼리용 역번호를 만듧니다.
			stationQuery = lineCode + stationNumber;

			// 출발, 도착역 버튼 이벤트 추가
			$loc.find(".infoMenu li").eq(0).click(function(){
				loadStaFirLatTime(lineCode,stationQuery);
			});

			// 출구정보 버튼 이벤트 추가
			$loc.find(".infoMenu li").eq(1).click(function(){
				loadStaGateInfo(stationQuery);
			});			

			// 기본값 실행
			$loc.find(".infoMenu li").eq(0).click();


			// 첫차 막차 시간표를 불러오는 함수
			function loadStaFirLatTime(lc,sq){
				
				if ( $(".infoStaTimetable").html() == "" ){

					// Loader Play!
					$(".loaders").css("display","block");

					$http.get('http://m.bus.go.kr/mBus/subway/getLastcarByStatn.bms?subwayId='+lc+'&statnId='+sq).success(function(data)
					{
						
						$(".infoStaTimetable").html(''
							+'<div class="infoStaFirTrain trainTimetable">'
							+'	<table border="0" cellspacing="0" cellpadding="0" class="list_4">'
							+'	<thead>'
							+'		<tr>'
							+'			<th>첫차</th>'
							+'			<th>평일</th>'
							+'			<th>토요일</th>'
							+'			<th>휴일</th>'
							+'		</tr>'
							+'	</thead>'
							+'	<tbody>'
							+'	</tbody>'
							+'	</table>'
							+'</div>'
							+'<div class="infoStaLstTrain trainTimetable">'
							+'	<table border="0" cellspacing="0" cellpadding="0" class="list_4">'
							+'	<thead>'
							+'		<tr>'
							+'			<th>막차</th>'
							+'			<th>평일</th>'
							+'			<th>토요일</th>'
							+'			<th>휴일</th>'
							+'		</tr>'
							+'	</thead>'
							+'	<tbody>'
							+'	</tbody>'
							+'	</table>'
							+'</div>'
							+'');

						for( var i = 0 ; i < data.resultList.length ; i++ ){
							if ( data.resultList[i].lastcarDiv == 1 ){
								$(".infoStaTimetable .infoStaFirTrain").find("tbody").append(''
									+'<tr>'
									+'	<th>'+data.resultList[i].statnNm+'행 ('+data.resultList[i].updnLine+')</th>'
									+'	<td>'+data.resultList[i].arvlHm1+'</td>'
									+'	<td>'+data.resultList[i].arvlHm2+'</td>'
									+'	<td>'+data.resultList[i].arvlHm3+'</td>'
									+'</tr>'
									+'');
							}else{
								$(".infoStaTimetable .infoStaLstTrain").find("tbody").append(''
									+'<tr>'
									+'	<th>'+data.resultList[i].statnNm+'행 ('+data.resultList[i].updnLine+')</th>'
									+'	<td>'+data.resultList[i].arvlHm1+'</td>'
									+'	<td>'+data.resultList[i].arvlHm2+'</td>'
									+'	<td>'+data.resultList[i].arvlHm3+'</td>'
									+'</tr>'
									+'');
							}
						}

					}).error(function(){			
						$(".loaders").fadeOut(200);
						viewCommBox("첫차/막차 시간표정보를 가져오지 못했습니다.");
					}).finally(function(){
						$loc.find(".infoStaCon").css("display","none");
						$loc.find(".infoStaTimetable").css("display","block");
						$loc.find(".infoMenu li").not(":eq(0)").removeClass("on");
						$loc.find(".infoMenu li:eq(0)").addClass("on");

						// 페이지의 정중앙에 위치
						$("#hdStaSubwayInfo").fadeIn(300);
						$("#hdStaSubwayInfo .infoCon").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2);
						$("#hdStaSubwayInfo .btnClose").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2-45);
						
						$(".loaders").fadeOut(200);
					});				
				}else{
					$(".loaders").fadeOut(200);
					
					$loc.find(".infoStaCon").css("display","none");
					$loc.find(".infoStaTimetable").css("display","block");
					$loc.find(".infoMenu li").not(":eq(0)").removeClass("on");
					$loc.find(".infoMenu li:eq(0)").addClass("on");

					$("#hdStaSubwayInfo .infoCon").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2);
					$("#hdStaSubwayInfo .btnClose").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2-45);
				}
			}

			// 출구정보를를 불러오는 함수
			function loadStaGateInfo(sq){

				if ( $(".infoStaGate").html() == "" ){

					// Loader Play!
					$(".loaders").css("display","block");

					$http.get('http://m.bus.go.kr/mBus/subway/getEntrcByInfo.bms?statnId='+sq).success(function(data)
					{

						// $(".infoStaGate").html() == "";						

						$(".infoStaGate").html(''
							+'<div class="trainGatetable">'
							+'	<table border="0" cellspacing="0" cellpadding="0" class="list_4">'
							+'	<thead>'
							+'		<tr>'
							+'			<th>출구번호</th>'
							+'			<th>주변건물</th>'
							+'		</tr>'
							+'	</thead>'
							+'	<tbody>'
							+'	</tbody>'
							+'	</table>'
							+'</div>'
							+'');

						for( var i = 0 ; i < data.resultList.length ; i++ ){

							$(".trainGatetable tbody").append(''
								+'<tr>'
								+'	<th>'+data.resultList[i].ectrcNo+'</th>'
								+'	<td><div>'+data.resultList[i].cfrBuld+'</div></td>'
								+'</tr>'
								+''
								+'');

						}

					}).error(function(){			
						$(".loaders").fadeOut(200);
						viewCommBox("해당 역사정보를 가져오지 못했습니다.");
					}).finally(function(){
						$loc.find(".infoStaCon").css("display","none");
						$loc.find(".infoStaGate").css("display","block");
						$loc.find(".infoMenu li").not(":eq(1)").removeClass("on");
						$loc.find(".infoMenu li:eq(1)").addClass("on");

						// 페이지의 정중앙에 위치
						$("#hdStaSubwayInfo").fadeIn(300);
						$("#hdStaSubwayInfo .infoCon").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2);
						$("#hdStaSubwayInfo .btnClose").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2-45);
						
						$(".loaders").fadeOut(200);
					});				
				}else{
					$(".loaders").fadeOut(200);
					
					$loc.find(".infoStaCon").css("display","none");
					$loc.find(".infoStaGate").css("display","block");
					$loc.find(".infoMenu li").not(":eq(1)").removeClass("on");
					$loc.find(".infoMenu li:eq(1)").addClass("on");

					$("#hdStaSubwayInfo .infoCon").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2);
					$("#hdStaSubwayInfo .btnClose").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2-45);
				}
			}

		}else{

			$(".loader-text").css("font-size","16px");
			$(".loader-text").html("Loading...");
			$(".infoMenu").css("display","none");

			if ( lineCode == "0116" ){				

				if ( appVar.ulineTable === null ){
					
					$http.get('json/ulineTimeGap.json').success(function(data){appVar.ulineGap = data;})

					$http.get('json/ulineTimeTable.json').success(
						function(data){appVar.ulineTable = data;						
					}).error(function(){
						viewCommBox("의정부 경전철 데이터를 가져오지 못했습니다1.");
					}).finally(function(){						
						showUlineInfo(stationNumber);
					});

				}else{

					showUlineInfo(stationNumber);

				}

			}else if( lineCode == "0119" ){				

				if ( appVar.everlineTable == null ){
					
					$http.get('json/everlineTimeGap.json').success(function(data){appVar.everlineGap = data;})

					$http.get('json/everlineTimeTable.json').success(
						function(data){appVar.everlineTable = data;						
					}).error(function(){
						viewCommBox("용인 경전철 데이터를 가져오지 못했습니다1.");
					}).finally(function(){						
						showEverlineInfo(stationNumber);
					});

				}else{

					showEverlineInfo(stationNumber);

				}
			}
		}
	}

	// 지하철 운영사 로고를 뿌려줍니다.
	var findOpcomIcon = function(val){
		switch (val){
			case 1 :
				return 'img/info_com1.gif';
				break;
			case 2 :
				return 'img/info_com2.gif';
				break;
			case 3 :
				return 'img/info_com3.gif';
				break;
			case 4 :
				return 'img/info_com4.gif';
				break;
			case 5 :
				return 'img/info_com5.gif';
				break;
			case 6 :
				return 'img/info_com6.gif';
				break;
			case 7 :
				return 'img/info_com7.gif';
				break;
			case 8 :
				return 'img/info_com8.gif';
				break;
			case 9 :
				return 'img/info_com9.gif';
				break;
			default :
				return 'img/info_com1.gif';
		}			
	}

	// 새로고침 버튼 이벤트
	$scope.fncRefresh = function(event,idx,name){
		$(event.target).addClass("on");
		realTimeArriveTrain(event,idx,name);
	}

	//
	$scope.showNgMapMenu = function(num){		
		showMapMenu(num);
	}	

	// 실시간 정보를 가져옵니다.
	var realTimeArriveTrain = function(event,idx,name){

		$(".loaders").fadeIn(200);

		// 노선코드를 저장합니다.
		lineCode = $(event.target).parent().parent().parent().attr("data-line");
		
		// 역번호를 저장합니다
		stationNumber = $(event.target).parent().parent().parent().attr("data-station");

		// 성수지선 예외 처리용
		excStationCode = $(event.target).parent().parent().parent().attr("data-station");

		$trainList = $(event.target).parent().parent().parent().find(".subwayArriveView ul");

		if ( lineCode != "1069" && lineCode != "0116" && lineCode != "0119"){  // 실시간 데이터를 불러오는 코드

			// 초기화
			tmpLoc = "";
			tmpACode = "";

			// 역번호의 정수부분만 뗍니다
			tmpLoc = stationNumber.replace(/[^\d]/g,"");	
			// 역번호의 알파벳만 뗍니다
			tmpACode = stationNumber.replace(/[\d]/g,"");

			// 역번호에 포함된 알파벳을 아스키 코드로 변환합니다.
			if ( tmpACode == "-") tmpACode = "";
			if ( tmpACode !== "" ) tmpACode = tmpACode.replace( tmpACode[0] , tmpACode.charCodeAt(0) );
			
			if ( lineCode == "1065" ){ // 예외처리
				stationNumber = String(tmpACode)+String(tmpLoc);
			}else{
				stationNumber = tmpACode+parseInt(tmpLoc,10);	
			}
								
			// 찾은 역번호를 6자리로 만듭니다.				
			if ( stationNumber.length < 6 ) {
					
				tmpLen = stationNumber.length;

				for ( var j = 0 ; j < 6 - tmpLen ; j++ ){
					stationNumber = "0"+stationNumber;						
				}

			}			
					
			//쿼리용 역번호를 만듧니다.
			stationQuery = lineCode + stationNumber;	

			$http.get('http://m.bus.go.kr/mBus/subway/getArvlByInfo.bms?subwayId='+lineCode+'&statnId='+stationQuery).success(function(data)
			{

				$trainList.html("");

				if ( data.error.errorCode != "0000" ){ // 데이터 로드 실패
					// 열차 정보가 없거나 운행 시간을 넘겼을때  
					$trainList.append('<li class="font_nanumBarunL">데이터를 불러오지 못했습니다.</li>');

				}else{ // 데이터 로드 성공

					if ( data.resultList == null ){

						$trainList.append('<li class="font_nanumBarunL">열차 도착 정보가 없습니다.</li>');

					}else{						

						// 역에 들어오는 지하철 방향 수
						var trainArrow = [];
						// 지하철 방향에 따른 들어오는 열차 정보 수
						var trainArrive = [];

						for ( var i = 0 ; i < data.resultList.length ; i++ ){

							if ( i !== 0 ){

								// 중복체크 변수
								tmpCnt = 0;

								// 동일한 방향의 정보는 trainArraive에 담습니다.
								for ( var j = 0 ; j < trainArrow.length ; j++ ){
									if ( trainArrow[j] == data.resultList[i].cStatnNm+checkHasClass(i)){
										trainArrive[j].push(i);
										tmpCnt++;
									}
								}

								// 중복없는 방향은 새로운 방향으로 추가해 줍니다.
								if( tmpCnt === 0 ){
									trainArrow.push(data.resultList[i].cStatnNm+checkHasClass(i));
									trainArrive[trainArrive.length]=[];
									trainArrive[trainArrive.length-1].push(i);
								}

							}else{
								// 첫번째 데이터는 바로 배열에 받습니다.
								trainArrow.push(data.resultList[i].cStatnNm+checkHasClass(i));
								trainArrive[0]=[];
								trainArrive[0].push(i);
							}

						};						

						for ( var i = 0 ; i < trainArrow.length ; i++ ){
							
							$trainList.append(''
								+'<li class="font_nanumBarunL">'
								+'	<div class="saLine"></div>'
								+'	<div class="saPoint saPointPrev"></div>'
								+'	<div class="saPoint saPointHere"></div>'
								+'	<div class="saPointNext"></div>'
								+'	<div class="saTitle saTitlePrev font_nanumBarunL"></div>'
								+'	<div class="saTitle saTitleHere font_nanumBarunL">'+name+'</div>'																
								+'	<div class="saTitleNext font_nanumBarunL">'+data.resultList[trainArrive[i][0]].cStatnNm+checkHasClass(trainArrive[i][0])+'</div>'
								+'	<div class="saIconExpress font_nanumBarunL">급행</div>'
								+'	<div class="saIconItx font_nanumBarunL"></div>'
								+'</li>'
								+'');

							tmpIdx = [-1,-1];
							tmpIdx[0] = $trainList.find("li").eq(i).find(".saTitleNext").html().indexOf("급행");
							// tmpIdx[1] = $trainList.find("li").eq(i).find(".saTitleNext").html().indexOf("ITX");

							// 급행일때
							if ( tmpIdx[0] > -1 ){
								$trainList.find("li").eq(i).find(".saTitleNext").html($trainList.find("li").eq(i).find(".saTitleNext").html().replace("급행",""));
								$trainList.find("li").eq(i).find(".saIconExpress").css("display","block");
								$trainList.find("li").eq(i).addClass("express");
							}
							
							// // ITX일때
							// if ( tmpIdx[1] > -1 ){						
							// 	$trainList.find("li").eq(i).find(".saTitleNext").html($trainList.find("li").eq(i).find(".saTitleNext").html().replace("ITX",""));
							// 	$trainList.find("li").eq(i).find(".saIconItx").css("display","block");
							// }

							// 상행선과 하행선의 방향을 바궈 줍니다. 이전역표시
							if ( data.resultList[trainArrive[i][0]].trainLine == 1 ){
								$trainList.find("li").eq(i).addClass("reverse");
								
								// 2호선 성수 지선 오류에 따른 예외 처리
								if ( excStationCode !== "211-1" && excStationCode !== "211-2" && excStationCode !== "211-3" && excStationCode !== "211-4" ){
									$trainList.find("li").eq(i).find(".saTitlePrev").html(data.resultList2[0].statnTnm);
									$trainList.find("li").eq(i).find(".saTitleNext").html(data.resultList2[0].statnFnm+"방면");
								}else{
									$trainList.find("li").eq(i).find(".saTitlePrev").html(data.resultList2[0].statnFnm);
									$trainList.find("li").eq(i).find(".saTitleNext").html(data.resultList2[0].statnTnm+"방면");
								}								

							}else{
								if ( excStationCode !== "211-1" && excStationCode !== "211-2" && excStationCode !== "211-3" && excStationCode !== "211-4" ){
									$trainList.find("li").eq(i).find(".saTitlePrev").html(data.resultList2[0].statnFnm);
									$trainList.find("li").eq(i).find(".saTitleNext").html(data.resultList2[0].statnTnm+"방면");
								}else{
									$trainList.find("li").eq(i).find(".saTitlePrev").html(data.resultList2[0].statnTnm);
									$trainList.find("li").eq(i).find(".saTitleNext").html(data.resultList2[0].statnFnm+"방면");
								}
							}

							// 열차 정보를 뿌려줍니다.
							for ( var j = 0 ; j < trainArrive[i].length ; j++ ){
								$trainList.find("li").eq(i).append(''
									+'<div class="saTrain '+n_subwayStaRtnPos(data.resultList[trainArrive[i][j]],i,$trainList)+'">'
									+'	<p class="tit font_nanumBarunL">'+data.resultList[trainArrive[i][j]].bStatnNm.replace("(급행)행","급행").replace("서울","서울역").replace("320","용유").replace("-1","광운대")+'</p>'
									+'	<p class="status font_nanumBarunL">'+n_subwayStaRtnText(data.resultList[trainArrive[i][j]]).replace("분 0초","분")+'</p>'
									+'	<p class="img"></p>'
									// +'	<p class="trainNo font_GothamL">'+data.resultList[trainArrive[i][j]].bTrainNo +'</p>'
									+'</div>');
							}
						}
					}

				}

				// 급행과 itx를 분리
				function checkHasClass(idx){
					if( data.resultList[idx].hasOwnProperty('bTrainSttus') ){
						return " "+data.resultList[idx].bTrainSttus;
					}else{
						return "";
					}
				}

			}).error(function(){
				$(".loaders").fadeOut(200);
				viewCommBox("실시간 정보를 가져오지 못했습니다.");
			}).finally(function(){
				$(".btnRefreshArea").removeClass("on");
				$(".loaders").fadeOut(200);
			});	


// 역의 상태를 텍스트로 표시합니다.
function n_subwayStaRtnText(val){

	switch( parseInt(val.arvlCd,10) ){
		case 0 :
			return '승강장 진입중';
			break;
		case 1 :
			return '승강장 도착';
			break;
		case 2 :
			return '다음역으로 출발';
			break;
		case 3 :
			return '전역 출발';
			break;
		case 5 :
			return '전역 도착';
			break;
		default :

			if ( parseInt(val.bArvlDt,10) === 0 ){ // 경의 중앙선의 경우
				return val.arvlMsg2.replace("[","").replace("]","");
			}else{ // 기타 노선
				if ( parseInt(val.bArvlDt,10) < 60 ){
					return parseInt(val.bArvlDt,10)+"초 후";
				}else{
					return parseInt(val.bArvlDt / 60,10) + "분 " + (val.bArvlDt % 60) +"초 후";
				}
				
			}

	}

}

// 열차의 현재위치를 표시해 줍니다.
function n_subwayStaRtnPos(val,idx,loc){

	switch( parseInt(val.arvlCd,10) ){
		case 0 :
			return 'arriveType4';
			break;
		case 1 :
			return 'arriveType5';
			break;
		case 2 :
			return 'arriveType6';
			break;
		case 3 :
			return 'arriveType3';
			break;
		case 5 :
			return 'arriveType2';
			break;
		default :

			if ( loc.find("li").eq(idx).find(".saTrain").eq(0).hasClass("arriveType1") ){
				return 'arriveType1ex';
			}else if( loc.find("li").eq(idx).find(".saTrain").eq(0).hasClass("arriveType2")){
				return 'arriveType1ex';
			}else{
				return 'arriveType1';	
			}
	}

}		

		}else{ // 시간표 정보를 받아오는 코드
			
			if( lineCode == "1069" ){// 인천지하철 시간표를 가져옵니다.

				nowDate = new Date();
				nowDay = dayDivision(nowDate.getDay());
				
				$trainList.html("");				

				// 이전역 이 있는지 여부 판단
				if ( $scope.subwayData[idx].lineCode === $scope.subwayData[idx-1].lineCode ){
					$http.get('http://openapi.seoul.go.kr:8088/sample/json/SearchArrivalInfoByIDService/1/2/'+$scope.subwayData[idx].stationCode+'/1/'+nowDay).success(function(data)
					{

						// 데이터가 있을때만
						if ( data.hasOwnProperty("SearchArrivalInfoByIDService") ){
							
							$trainList.append('<li class="ttData font_nanumBarunL ttData1"></li>');

							for( var i = 0 ; i < data.SearchArrivalInfoByIDService.row.length ; i++ ){
								$trainList.find(".ttData1").append(''
									+'<div class="ttData_arr font_nanumBarunL">'
									+'	<div class="arrText font_nanumL">'+$scope.subwayData[idx-1].stationName+' 방면</div>'
									+'	<div class="arrTimeText font_nanumBarunL"><span class="font_GothamL">'+data.SearchArrivalInfoByIDService.row[i].LEFTTIME.substr(0,5).replace(":"," : ")+'</span> 분 도착예정</div>'
									+'	<div class="desText font_nanumBarunL">( '+data.SearchArrivalInfoByIDService.row[i].SUBWAYNAME+'행 - <span class="font_GothamL">'+data.SearchArrivalInfoByIDService.row[i].TRAINCODE+'</span> )</div>'
									+'</li>'
									+'');
							}

						}else{
							// 실패시
							$trainList.append('<li class="font_nanumBarunL">현 시간 이후 운행 정보가 없습니다.</li>');
						}
						
					}).error(function(){
						$(".btnRefreshArea").removeClass("on");
						$(".loaders").fadeOut(200);
						viewCommBox("시간표 정보를 가져오지 못했습니다.");
					}).finally(function(){
						$(".btnRefreshArea").removeClass("on");
						$(".loaders").fadeOut(200);
					});
				}

				// 다음역이 있는지 여부 판단
				if ( $scope.subwayData[idx].lineCode === $scope.subwayData[idx+1].lineCode ){
					$http.get('http://openapi.seoul.go.kr:8088/sample/json/SearchArrivalInfoByIDService/1/2/'+$scope.subwayData[idx].stationCode+'/2/'+nowDay).success(function(data)
					{
						$(".btnRefreshArea").addClass("on");
						$(".loaders").css("dispaly","block");
					
						// 데이터가 있을때만
						if ( data.hasOwnProperty("SearchArrivalInfoByIDService") ){
							
							$trainList.append('<li class="ttData font_nanumBarunL ttData2"></li>');

							for( var i = 0 ; i < data.SearchArrivalInfoByIDService.row.length ; i++ ){
								$trainList.find(".ttData2").append(''
									+'<div class="ttData_arr font_nanumBarunL">'
									+'	<div class="arrText font_nanumL">'+$scope.subwayData[idx+ 1].stationName+' 방면</div>'
									+'	<div class="arrTimeText font_nanumBarunL"><span class="font_GothamL">'+data.SearchArrivalInfoByIDService.row[i].LEFTTIME.substr(0,5).replace(":"," : ")+'</span> 분 도착예정</div>'
									+'	<div class="desText font_nanumBarunL">( '+data.SearchArrivalInfoByIDService.row[i].SUBWAYNAME+'행 - <span class="font_GothamL">'+data.SearchArrivalInfoByIDService.row[i].TRAINCODE+'</span> )</div>'
									+'</li>'
									+'');
							}

						}else{
							// 실패시
							$trainList.append('<li class="font_nanumBarunL">현 시간 이후 운행 정보가 없습니다.</li>');
						}

						
					}).error(function(){
						$(".btnRefreshArea").removeClass("on");
						$(".loaders").fadeOut(200);
						viewCommBox("시간표 정보를 가져오지 못했습니다.");
					}).finally(function(){
						$(".btnRefreshArea").removeClass("on");
						$(".loaders").fadeOut(200);
					});
				}

			}else if( lineCode == "0116" ) {
				//의정부 경전철
				$(".loader-text").css("font-size","16px");
				$(".loader-text").html("Loading...");

				if ( appVar.ulineTable === null ){
					
					$http.get('json/ulineTimeGap.json').success(
					function(data)
					{
						appVar.ulineGap = data;
							
					})

					$http.get('json/ulineTimeTable.json').success(
					function(data)
					{
						appVar.ulineTable = data;
						
					}).error(function(){			
						
						$trainList.html('<li class="font_nanumBarunL">데이터를 가져오지 못했습니다.</li>');
						viewCommBox("의정부 경전철 데이터를 가져오지 못했습니다.");

					}).finally(function(){						
						showUlineData($trainList,stationNumber);
					});
						
				}else{

					showUlineData($trainList,stationNumber);

				}

			}else if( lineCode == "0119" ) {
				// 용인 경전철
				$(".loader-text").css("font-size","16px");
				$(".loader-text").html("Loading...");

				// 다음역이 없을때를 방지한 예외 처리
				var arrStation = {
					prevsta	: $scope.subwayData[idx-1].stationName,
					nextsta	: null
				}

				if ( stationNumber != "Y126" ){
					arrStation.nextsta = $scope.subwayData[idx+1].stationName
				}

				// 데이터 최초 로딩시 json 로드
				if ( appVar.everlineTable == null ){

					$http.get('json/everlineTimeTable.json').success(
					function(data)
					{
						appVar.everlineTable = data;
						
					}).error(function(){			
						
						$trainList.html('<li class="font_nanumBarunL">데이터를 가져오지 못했습니다.</li>');
						viewCommBox("용인 경전철 데이터를 가져오지 못했습니다.");

					}).finally(function(){						
						showEverlineData($trainList,stationNumber,arrStation);
					});
						
				}else{

					showEverlineData($trainList,stationNumber,arrStation);

				}
			}else{

				$trainList.html('<li class="font_nanumBarunL">도착정보를 준비중입니다</li>');				
				$(".loaders").fadeOut(200);

			}

		}
	}

}

// 의정부 경전철 데이터 로딩
function showUlineData(con,num){

	var nowDate = new Date(); // 현재시간
	var desDate1 = new Date(); // 첫차
	var desDate2 = new Date(); // 막차
	var tmp;
	var nowDay = dayDivision(nowDate.getDay());

	// nowDate.setHours(4);

	con.html('<li class="ttData font_nanumBarunL"></li>');

	//발곡행
	if ( num !== "U110" ){
		tmp = eval("appVar.ulineTable."+num+".firstDes1").split(":");
		desDate1.setHours(parseInt(tmp[0]));
		desDate1.setMinutes(parseInt(tmp[1]));
		tmp = eval("appVar.ulineTable."+num+".lastDes1").split(":");
		desDate2.setHours(parseInt(tmp[0]));
		desDate2.setMinutes(parseInt(tmp[1]));

		if ( nowDate.getTime() < desDate1.getTime() && nowDate.getTime() > desDate2.getTime() ){ // 첫차시간
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">발곡행</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> 첫차 : '+eval("appVar.ulineTable."+num+".firstDes1")+'분 도착</div>'
				+'</div>');	
		}else if( nowDate.getTime() < desDate2.getTime() ){ // 막차시간
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">발곡행</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> 막차 : '+eval("appVar.ulineTable."+num+".lastDes1")+'분 도착</div>'
				+'</div>');	
		}else{ // 운행시간
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">발곡행</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> '+nowDate.getHours()+'시 배차간격 : '+eval("appVar.ulineGap.day"+nowDay+".h"+nowDate.getHours()).replace(":","분 ")+'초</div>'
				+'</div>');	
		}
	}

	// 탑석행
	if ( num !== "U125" ){
		tmp = eval("appVar.ulineTable."+num+".firstDes2").split(":");
		desDate1.setHours(parseInt(tmp[0]));
		desDate1.setMinutes(parseInt(tmp[1]));
		tmp = eval("appVar.ulineTable."+num+".lastDes2").split(":");
		desDate2.setHours(parseInt(tmp[0]));
		desDate2.setMinutes(parseInt(tmp[1]));

		if ( nowDate.getTime() < desDate1.getTime() && nowDate.getTime() > desDate2.getTime() ){
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">탑석행</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> 첫차 : '+eval("appVar.ulineTable."+num+".firstDes2")+'분 도착</div>'
				+'</div>');	
		}else if( nowDate.getTime() < desDate2.getTime() ){
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">탑석행</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> 막차 : '+eval("appVar.ulineTable."+num+".lastDes2")+'분 도착</div>'
				+'</div>');	
		}else{
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">탑석행</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> '+nowDate.getHours()+'시 배차간격 : '+eval("appVar.ulineGap.day"+nowDay+".h"+nowDate.getHours()).replace(":","분 ")+'초</div>'
				+'</div>');	
		}
	}
	$(".btnRefreshArea").removeClass("on");
	$(".loaders").fadeOut(200);
}

function showUlineInfo(stationCode){

	$(".infoStaFirTrain").html(''
		+'<table border="0" cellspacing="0" cellpadding="0" class="list_3">'
		+'<thead>'
		+'<tr>'
		+'	<th>첫차</th>'
		+'	<th>평일/주말</th>'
		+'</tr>'
		+'</thead>'
		+'<tbody>'
		+'</tbody>'
		+'</table>'
		+'');

	$(".infoStaLstTrain").html(''
		+'<table border="0" cellspacing="0" cellpadding="0" class="list_3">'
		+'<thead>'
		+'<tr>'
		+'	<th>막차</th>'
		+'	<th>평일/주말</th>'
		+'</tr>'
		+'</thead>'
		+'<tbody>'
		+'</tbody>'
		+'</table>'
		+'');

	if ( eval("appVar.ulineTable."+stationCode+".firstDes1") !== "-" ){
		$(".infoStaFirTrain").find("tbody").append(''
			+'<tr>'
			+'	<th>발곡</th>'
			+'	<th>'+eval("appVar.ulineTable."+stationCode+".firstDes1")+'</th>'
			+'</tr>'
			+'');
	}

	if ( eval("appVar.ulineTable."+stationCode+".firstDes2") !== "-" ){
		$(".infoStaFirTrain").find("tbody").append(''
			+'<tr>'
			+'	<th>탑석</th>'
			+'	<th>'+eval("appVar.ulineTable."+stationCode+".firstDes2")+'</th>'
			+'</tr>'
			+'');
	}

	if ( eval("appVar.ulineTable."+stationCode+".lastDes1") !== "-" ){
		$(".infoStaLstTrain").find("tbody").append(''
			+'<tr>'
			+'	<th>발곡</th>'
			+'	<th>'+eval("appVar.ulineTable."+stationCode+".lastDes1")+'</th>'
			+'</tr>'
			+'');
	}

	if ( eval("appVar.ulineTable."+stationCode+".lastDes2") !== "-" ){
		$(".infoStaLstTrain").find("tbody").append(''
			+'<tr>'
			+'	<th>탑석</th>'
			+'	<th>'+eval("appVar.ulineTable."+stationCode+".lastDes2")+'</th>'
			+'</tr>'
			+'');
	}

			$("#hdStaSubwayInfo").fadeIn(300);
			$("#hdStaSubwayInfo .infoCon").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2);
			$("#hdStaSubwayInfo .btnClose").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2-45);
				
			$(".loaders").fadeOut(200);
}

// 용인 경전철 데이터 로딩
function showEverlineData(con,num,arrStation){

	var nowDate = new Date(); // 현재시간
	var desDate1 = new Date(); // 첫차
	var desDate2 = new Date(); // 막차
	var tmp;
	var nowDay = dayDivision(nowDate.getDay());

	// nowDate.setHours(0);

	con.html('<li class="ttData font_nanumBarunL"></li>');

	//기흥행
	if ( num !== "Y110" ){
		tmp = eval("appVar.everlineTable."+num+".firstDes1").split(":");
		desDate1.setHours(parseInt(tmp[0]));
		desDate1.setMinutes(parseInt(tmp[1]));
		tmp = eval("appVar.everlineTable."+num+".lastDes1").split(":");
		desDate2.setHours(parseInt(tmp[0]));
		desDate2.setMinutes(parseInt(tmp[1]));

		if ( nowDate.getTime() < desDate1.getTime() || nowDate.getTime() > desDate2.getTime() ){ // 첫차시간
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">'+arrStation.prevsta+' 방면</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> 첫차 : '+eval("appVar.everlineTable."+num+".firstDes1")+'분 도착</div>'
				+'	<div class="desText font_nanumBarunL">( 기흥(백남준아트센터)행 )</div>'
				+'</div>');	
		}else if( nowDate.getTime() > desDate2.getTime() - 600000 ){ // 막차시간
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">'+arrStation.prevsta+' 방면</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> 막차 : '+eval("appVar.everlineTable."+num+".lastDes1")+'분 도착</div>'
				+'	<div class="desText font_nanumBarunL">( 기흥(백남준아트센터)행 )</div>'
				+'</div>');	
		}else{ // 운행시간
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">'+arrStation.prevsta+' 방면</div>'
				+'	<div class="arrTimeText font_nanumBarunL">'+rtnTimeTable(nowDate,num,1)+'</div>'
				+'	<div class="desText font_nanumBarunL">( 기흥(백남준아트센터)행 )</div>'
				+'</div>');	
		}
	}
	// 전대·에버랜드 방면
	if ( num !== "Y126" ){
		tmp = eval("appVar.everlineTable."+num+".firstDes2").split(":");
		desDate1.setHours(parseInt(tmp[0]));
		desDate1.setMinutes(parseInt(tmp[1]));
		tmp = eval("appVar.everlineTable."+num+".lastDes2").split(":");
		desDate2.setHours(parseInt(tmp[0]));
		desDate2.setMinutes(parseInt(tmp[1]));

		if ( nowDate.getTime() < desDate1.getTime() || nowDate.getTime() > desDate2.getTime() ){
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">'+arrStation.nextsta+' 방면</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> 첫차 : '+eval("appVar.everlineTable."+num+".firstDes2")+'분 도착</div>'
				+'	<div class="desText font_nanumBarunL">( 전대·에버랜드행 )</div>'
				+'</div>');	
		}else if( nowDate.getTime() > desDate2.getTime() - 600000  ){
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">'+arrStation.nextsta+' 방면</div>'
				+'	<div class="arrTimeText font_nanumBarunL"> 막차 : '+eval("appVar.everlineTable."+num+".lastDes2")+'분 도착</div>'
				+'	<div class="desText font_nanumBarunL">( 전대·에버랜드행 )</div>'
				+'</div>');	
		}else{
			con.find("li").append(''
				+'<div class="ttData_arr font_nanumBarunL">'
				+'	<div class="arrText font_nanumL">'+arrStation.nextsta+' 방면</div>'
				+'	<div class="arrTimeText font_nanumBarunL">'+rtnTimeTable(nowDate,num,2)+'</div>'
				+'	<div class="desText font_nanumBarunL">( 전대·에버랜드행 )</div>'
				+'</div>');	
			// rtnTimeTable(nowDate,num,1);
		}
	}
	$(".btnRefreshArea").removeClass("on");
	$(".loaders").fadeOut(200);
}

function rtnTimeTable(nowDate,num,arrow){
	nowHour = nowDate.getHours();
	nowMin = nowDate.getMinutes();
	tmpDate = new Date();
	tmpDateNext = new Date();
	var timeGap;
	var timeReturn;
	var idx = 0;

	tmpMin = eval("appVar.everlineTable."+num+".des"+arrow+"_time"+nowHour).split("/");

	// 해당 시간의 마지막 시간을 초과했을때
	tmpDate.setMinutes(tmpMin[tmpMin.length-1]);
	tmpDate.setSeconds(0);

	if ( nowDate.getTime() > tmpDate.getTime() ){
		tmpMin = null;
		tmpMin = eval("appVar.everlineTable."+num+".des"+arrow+"_time"+(nowHour+1)).split("/");
		tmpDateNext.setHours(nowHour+1);
		tmpDateNext.setMinutes(tmpMin[0]);
		tmpDateNext.setSeconds(0);

		// timeReturn = add0(tmpDateNext.getHours())+' : '+add0(tmpDateNext.getMinutes())+'분 도착예정';
		timeGap = tmpDateNext.getTime() - nowDate.getTime();

	}else{
		for ( var i = 0 ; i < tmpMin.length ; i++ ){
			if ( nowMin+1 > tmpMin[i] ) idx++;
			// if ( nowMin > tmpMin[i] ) idx++;
		}
		
		tmpDate.setMinutes(tmpMin[idx]);

		// timeReturn = add0(tmpDate.getHours())+' : '+add0(tmpDate.getMinutes())+'분 도착예정';
		timeGap = tmpDate.getTime() - nowDate.getTime();

	}

	// return timeReturn;
	if ( calcArrTime(timeGap).min == 0 ){
		return calcArrTime(timeGap).sec+'초 후 도착예정';
	}else{
		return calcArrTime(timeGap).min+'분 '+calcArrTime(timeGap).sec+'초 후 도착예정';
	}
	
}

function add0(val){
	if ( val < 10 ){
		val = "0"+val;
	}
	return val;
}

// 밀리초를 분,초로 환산
function calcArrTime(val){

	var min;
	var sec;
	var result;
	tmp = val;

	min = tmp / (1000*60);
	tmp = tmp - (1000*60)*parseInt(min,10);
	sec = tmp / 1000;

	result = {
		min : parseInt(min,10),
		sec : parseInt(sec,10)
	}
	return result; 

}

function showEverlineInfo(stationCode){

	$(".infoStaFirTrain").html(''
		+'<table border="0" cellspacing="0" cellpadding="0" class="list_3">'
		+'<thead>'
		+'<tr>'
		+'	<th>첫차</th>'
		+'	<th>평일/주말</th>'
		+'</tr>'
		+'</thead>'
		+'<tbody>'
		+'</tbody>'
		+'</table>'
		+'');

	$(".infoStaLstTrain").html(''
		+'<table border="0" cellspacing="0" cellpadding="0" class="list_3">'
		+'<thead>'
		+'<tr>'
		+'	<th>막차</th>'
		+'	<th>평일/주말</th>'
		+'</tr>'
		+'</thead>'
		+'<tbody>'
		+'</tbody>'
		+'</table>'
		+'');

	if ( eval("appVar.everlineTable."+stationCode+".firstDes1") !== "-" ){
		$(".infoStaFirTrain").find("tbody").append(''
			+'<tr>'
			+'	<th>기흥(백남준아트센터)</th>'
			+'	<th>'+eval("appVar.everlineTable."+stationCode+".firstDes1")+'</th>'
			+'</tr>'
			+'');
	}

	if ( eval("appVar.everlineTable."+stationCode+".firstDes2") !== "-" ){
		$(".infoStaFirTrain").find("tbody").append(''
			+'<tr>'
			+'	<th>전대·에버랜드</th>'
			+'	<th>'+eval("appVar.everlineTable."+stationCode+".firstDes2")+'</th>'
			+'</tr>'
			+'');
	}

	if ( eval("appVar.everlineTable."+stationCode+".lastDes1") !== "-" ){
		$(".infoStaLstTrain").find("tbody").append(''
			+'<tr>'
			+'	<th>기흥(백남준아트센터)</th>'
			+'	<th>'+eval("appVar.everlineTable."+stationCode+".lastDes1")+'</th>'
			+'</tr>'
			+'');
	}

	if ( eval("appVar.everlineTable."+stationCode+".lastDes2") !== "-" ){
		$(".infoStaLstTrain").find("tbody").append(''
			+'<tr>'
			+'	<th>전대·에버랜드</th>'
			+'	<th>'+eval("appVar.everlineTable."+stationCode+".lastDes2")+'</th>'
			+'</tr>'
			+'');
	}

			$("#hdStaSubwayInfo").fadeIn(300);
			$("#hdStaSubwayInfo .infoCon").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2);
			$("#hdStaSubwayInfo .btnClose").css("margin-top",-$("#hdStaSubwayInfo .infoCon").height()/2-45);
				
			$(".loaders").fadeOut(200);

}

// 평일, 휴일, 공휴일 판단
function dayDivision(val){

	switch (val){
		case 0 :
			return 3;
			break;
		case 1 :
			return 1;
			break;
		case 2 :
			return 1;
			break;
		case 3 :
			return 1;
			break;
		case 4 :
			return 1;
			break;
		case 5 :
			return 1;
			break;
		case 6 :
			return 2;
			break;		
		default :
			return false;
	}

}


// 두지점간의 거리를 구하는 함수 
function computeDistance(desLat, desLng, type){

    var startLatRads = degreesToRadians(appVar.posLat);
    var startLongRads = degreesToRadians(appVar.posLng);
    var destLatRads = degreesToRadians(desLat);
    var destLongRads = degreesToRadians(desLng);

    var Radius = 6371;   // radius은 지구의 반경
    var distance = Math.acos(Math.sin(startLatRads) * Math.sin(destLatRads) + Math.cos(startLatRads) * Math.cos(destLatRads) * Math.cos(startLongRads - destLongRads)) * Radius;

    if ( type === "m" ){ // 미터로 환산 후 리턴
    	return parseInt(distance * 1000,10);
    }else if( type === "km"){ // 킬로미터로 환산 후 리턴
     	return distance.toFixed(1) * 10 / 10 ;
    }else{ // 전부 리턴
    	return distance;
    }

}

function degreesToRadians(degrees) {
    radians = (degrees * Math.PI)/180;
    return radians;
}

// 메인화면 우상단 메뉴 선택 함수
function viewSelMenu(con){

	switch (con){
		case '#hdStaSubway' :
			// 실시간 도착정보
			// $("#hdStaInp").find("input").val("동대문");
			$(con).css({"display":"block"});
			$("#hdStaInp").css({"display":"block"});
			$("#hdStaSubwayMap,#hdStaSubwayLoc,#hdStaSwPosMenu,#hdStaSwPos").css("display","none");
			$("#hdStaMenu").css("display","none");
			//버튼활성화
				$("#hdStaMenu .menuCon ul li").removeClass("on");
				$("#hdStaMenu .menuCon ul li.btnMenuRTM").addClass("on");
			break;
		case '#hdStaSwPos' :
			// 열차 위치 보기
				appVar.trainPosLine = parseInt($("#hdStaSubway .subwayList li").eq(0).attr("data-line"),10);
				// 현재 선택된 노선의 위치를 가져옵니다.
				releaseTrainPos(appVar.trainPosLine,$("#hdStaSubway .subwayList li").eq(0).find(".staNameKor").text());
			
			$(con).css({"display":"block"});
			$("#hdStaSwPosMenu").css({"display":"block"});
			$("#hdStaSubwayMap,#hdStaSubwayLoc,#hdStaSubway, #hdStaInp").css("display","none");
			$("#hdStaMenu").css("display","none");
			//버튼활성화
				$("#hdStaMenu .menuCon ul li").removeClass("on");
				$("#hdStaMenu .menuCon ul li.btnMenuRPM").addClass("on");			
			break;
		case '#hdStaSubwayMap' :
			// 지하철 노선도
			$(con).css({"display":"block"});
			$("#hdStaSubwayLoc").css({"display":"block"});
			$("#hdStaSubway, #hdStaInp,#hdStaSwPosMenu,#hdStaSwPos").css("display","none");		
			// $("#hdStaSubwayMap").css({"display":"block"});
			$(con).find("svg").css({"width":"1400px","height":"990px"});
			$(con).scrollLeft(600);
			// $("#hdStaMenu .menuCon").stop(true,false).animate({"margin-left":"-145%"},300);
			$("#hdStaMenu").css("display","none");
			//버튼활성화
				$("#hdStaMenu .menuCon ul li").removeClass("on");
				$("#hdStaMenu .menuCon ul li.btnMenuMap").addClass("on");						
			break;
		case '#hdStaNotice' :			
			// 공지사항
			$("#hdStaMenu").css("display","none");
			$("#notice").css("display","block");
			break;		
		case '#hdStaAbout' :
			// 후다닥 스테이션은
			$("#hdStaMenu .menuCon").stop(true,false).animate({"margin-left":"-145%"},200);
			$("#hdStaAbout").stop(true,false).animate({"margin-left":"-45%"},200);
			break;	
		default :
			viewCommBox("서비스를 준비중입니다.");
			return false;		
	}

}

// 메뉴가 열릴때 포지션 초기화
function viewSelMenuInit(){
	$("#hdStaMenu .menuCon").css("margin-left","-45%");
	$("#hdStaConfig, #hdStaAbout").css("margin-left","55%");
}

function viewSelMenuBack(con){
	$("#hdStaMenu .menuCon").stop(true,false).animate({"margin-left":"-45%"},300);
	$(con).stop(true,false).stop(true,false).animate({"margin-left":"55%"},300);
}

function viewCommBox(text){
	$("#commLayer").html(text);
	$("#commLayer").fadeIn(300);
	backKeyTimer = setTimeout(fncBackKey,2000);
}

var backKeySta = false;
var backKeyTimer;

// CLient와 Cordova 상에서의 확인창 분기
function showAppExitConfirm(){
	
	if ( $(".loaders").css("display") !== "none" || $("#hdStaSubwayInfo").css("display") !== "none" || $("#hdStaMenu").css("display") !== "none" || $("#notice").css("display") !== "none"){

		$(".loaders, #hdStaSubwayInfo, #hdStaMenu, #notice").fadeOut(300);

	}else{

		// if ( $(".input_inner input ").val() !== "" ){

		// 	//$(".input_inner input").val(null);
		// 	$(".input_inner input").focus(function(){
		// 		$(this).val(null)
		// 	});

		// }else{

			if ( !backKeySta ){

				backKeySta = true;
				$("#commLayer").html("한번 더 누르면 앱을 종료합니다.");
				$("#commLayer").fadeIn(300);
				backKeyTimer = setTimeout(fncBackKey,2000);

			}else{

				navigator.app.exitApp();

			}
			// navigator.notification.confirm(
			// 	"앱을 종료하시겠습니까?",    // message
			// 	onConfirm,   // callback
			// 	"후다닥 스테이션 - 수도권 지하철",      // title
			// 	["확인","취소"]  // buttonName
			// );

		// }

	}
}

function fncBackKey(){
	$("#commLayer").fadeOut(300);
	backKeySta = false;
	clearTimeout(backKeyTimer);
}

function onConfirm(buttonIdx){
	if ( buttonIdx === 1 ){
		navigator.app.exitApp();
	}
}

function showMapMenu(station,evt) {

	var e = evt || window.event;
	var eTarget = e.target || e.srcElement;
	var pos = $(eTarget).position();

	// 필요한 로직 수행
	if (e.preventDefault) e.preventDefault();               // IE 일 경우 예외 처리
	if (e.stopPropagation) e.stopPropagation();          // IE 일 경우 예외 처리

	var staLen = station.split(",");
	var $loc = $("#hdStaSubwayMapSelLine .selStation");

	if ( staLen.length > 1 ){

		$loc.css({"display":"none"});
		$("#hdStaSubwayMapSelLine").css({"display":"block"});
		$("#hdStaSubwayMapSelLine .selLine").css({"margin-top": -46 * staLen.length / 2 - 25 })
		$("#hdStaSubwayMapSelLine").find("ul li").css("display","none");

		for( var i = 0 ; i < staLen.length ; i++ ){
			$("#hdStaSubwayMapSelLine").find("ul li.selLine"+staLen[i]).css("display","block");
		}

	}else{		
		$("#hdStaSubwayMapSelLine").find("ul li").css("display","none");
		$("#hdStaSubwayMapSelLine").css({"display":"block"});		
		$loc.css({"display":"block"});
		$loc.find(".infoStaNum").html('<p class="numIco line'+$(".selLine"+station).attr("line-code")+' font_GothamL">'+station+'</p>');			
		$loc.find(".infoStaName").html($(".selLine"+station).find("div:nth-child(2)").html());
		$loc.find(".infoStaNameEng").html($(".selLine"+station).find("div:nth-child(3)").html());

		// 시작역을 설정하는 버튼 이벤트
		$loc.find(".btnSelStart").unbind("click");
		$loc.find(".btnSelStart").click(function(){
			setStation('start',$(".selLine"+station).attr('data-station-code'),$(".selLine"+station +" > div").eq(1).html());
		});

		// 도착역을 설정하는 버튼 이벤트
		$loc.find(".btnSelEnd").unbind("click");
		$loc.find(".btnSelEnd").click(function(){
			setStation('end',$(".selLine"+station).attr('data-station-code'),$(".selLine"+station +" > div").eq(1).html());
		});

		// 역정보를 보여주는 버튼 이벤트
		$loc.find(".btnSelInfo").unbind("click");
		$loc.find(".btnSelInfo").click(function(){
			$(".loaders").fadeIn(200);
			$(".selLine"+station).find(".btnInfo").click();
		});
	}
	// $(".hdStaSubwayMapSelLine").css({"display":"block","top":pos.top+12,"left":pos.left+12});
}

// 시작역 및 도착역 찾기 함수
function setStation(action,num,name){

	switch(action){
		case 'start' :
			// alert('start : '+num);

			if ( appVar.stationStart === num ){ // 기존과 같은 역 설정시

				viewCommBox("이미 시작역으로 설정되었습니다.");

			}else{ // 기존역과 다르거나 설정이 되어있지 않을때 

				if ( appVar.stationEnd === null ){ // 도착역이 비어있을때 

					appVar.stationStart = num;
					$("#hdStaSubwayLoc .locStart .txtStation").html(name);
					$("#hdStaSubwayMapSelLine .btnInfoClose").click();					

				}else{ // 도착역이 비어있지 않을때

					if( appVar.stationEnd === num ){
						viewCommBox("이미 도착역으로 설정되었습니다.");
					}else{
						appVar.stationStart = num;
						$("#hdStaSubwayLoc .locStart .txtStation").html(name);
						$("#hdStaSubwayMapSelLine .btnInfoClose").click();

						// 최단 경로 데이터를 불러옵니다.
						loadStationLoc(appVar.stationStart,appVar.stationEnd);
					}

				}
			}

			break;
		case 'end' :
			// alert('end : '+num);
			// 
			if ( appVar.stationEnd === num ){ // 기존과 같은 역 설정시

				viewCommBox("이미 도착역으로 설정되었습니다.");

			}else{ // 기존역과 다르거나 설정이 되어있지 않을때 

				if ( appVar.stationStart === null ){ // 도착역이 비어있을때 

					appVar.stationEnd = num;
					$("#hdStaSubwayLoc .locEnd .txtStation").html(name);
					$("#hdStaSubwayMapSelLine .btnInfoClose").click();					

				}else{ // 도착역이 비어있지 않을때

					if( appVar.stationStart === num ){
						viewCommBox("이미 시작역으로 설정되었습니다.");
					}else{
						appVar.stationEnd = num;
						$("#hdStaSubwayLoc .locEnd .txtStation").html(name);
						$("#hdStaSubwayMapSelLine .btnInfoClose").click();

						// 최단 경로 데이터를 불러옵니다.
						loadStationLoc(appVar.stationStart,appVar.stationEnd);
					}

				}
			}

			break;
		default :
			break;
	}

}

// 상단 경로바 우측버튼을 통해 검색한 경로를 재탐색합니다.
function findLoc(){
	if (  appVar.stationStart == null || appVar.stationEnd == null ){
		viewCommBox("시작역 또는 도착역이 설정되지 않았습니다.");
	}else{
		// 최단 경로 데이터를 불러옵니다.
		loadStationLoc(appVar.stationStart,appVar.stationEnd);
	}
}

// 최단거리 경로 검색을 하는 함수 입니다.
function loadStationLoc(startPos,endPos){

	$(".loaders").fadeIn(100);
	var nowDate = new Date();

	// 최단 거리 검색은 도시철도공사 홈페이지를 이용합니다.
	$.post("http://m.smrt.co.kr/html/searchInfo.jsp",{
		start : startPos, end : endPos , skind : 1 , weekTag : dayDivision(nowDate.getDay()) ,  lang : "k"
	},function(data,status){
		
		//결과에서 필요한 내용만 쪼갭니다.
		var result  = [];
		var tmp = data;
		result[0] = tmp.split('<!-- // header -->');
		result[1] = result[0][1].split('<div id="main2" role="main">');

		// 숨겨진 영역에 추출된 소스를 뿌려줍니다.
		$("#hdStaSubwayShowLoc").find(".showLocDummy").html(result[1][0]);

		var $targetLoc = $("#hdStaSubwayShowLoc .showLocDummy .subway-map").find("li");
		var $realLoc = $("#hdStaSubwayShowLoc").find(".showLocInfo");

		$realLoc.find(".showLocMap ul").html("");

		$targetLoc.each(function(e){
			if ( e === 0 ){ // 출발역
				$realLoc.find(".showLocMap ul").append(''
					+'<li>'
					+	'<div class="lineNum '+$(this).find(".rnd").attr("class")+'">출발</div>'
					+'	<div class="staDat">'
					+'		<p class="txt">출발시간 <span>'+$(this).find(".balloon + span").html().replace(":"," : ")+'</span></p>'
					+'		<p class="tit">'+$(this).find(".st a").html().replace("<br>","&nbsp;<span>")+'</p>'
					+'	</div>'
					+'</li>'
					+'');

				// 경전철 예외 처리
				excLrtOutput("start",e,true);

			}else if( e === $targetLoc.length-1 ){ // 도착역

				$realLoc.find(".showLocMap ul").append(''
					+'<li>'
					+	'<div class="lineNum '+$(this).find(".rnd").attr("class")+'">도착</div>'
					+'	<div class="staDat">'
					+'		<p class="txt">도착시간 <span>'+$(this).find(".balloon + span").html().replace(":"," : ")+'</span></p>'
					+'		<p class="tit">'+$(this).find(".st a").html().replace("<br>","&nbsp;<span>")+'</p>'
					+'	</div>'
					+'</li>'
					+'');

				// 경전철 예외 처리
				excLrtOutput("end",e,false);

			}else{

				if ( $(this).hasClass("line") || $(this).hasClass("offline") ){ // 중단 라인

					$realLoc.find(".showLocMap ul").append(''
						+'<li>'
						+'<div class="'+$(this).attr("class").replace(/off/g,"")+'"></div>'
						+'</li>'
						+'');

				}else if( $(this).hasClass("trans") ){ // 환승역

					$realLoc.find(".showLocMap ul").append(''
						+'<li>'
						+	'<div class="lineNum '+$(this).find("+ li").attr("class").replace(/l/g,"r").replace(/off/g,"")+'">환승</div>'
						+'	<div class="staDat">'
						+'		<p class="txt">환승 <span>'+$(this).find(".balloon + span").html().replace(":"," : ")+'</span> &nbsp;&nbsp;&nbsp; 빠른환승 : '+$(this).find(".tip").html().replace("빠른환승 :","").replace("번칸","-").replace("번문","")+'</p>'
						+'		<p class="tit">'+$(this).find(".st a").html().replace("<br>","&nbsp;<span>")+'</p>'
						+'	</div>'
						+'</li>'
						+'');

					// 경전철 예외 처리
					if ( $realLoc.find(".showLocMap ul li").eq(e).find(".lineNum").hasClass("lineNum ") ){

						excLrtOutput("end",e,true);

					}

				}

			}
		});

		$realLoc.find(".showLocTime").html( "소요시간 : " + $("#hdStaSubwayShowLoc .showLocDummy .bordered").find(".tal").eq(0).text() + ' <span class="locStaLen">('+$("#hdStaSubwayShowLoc .showLocDummy .bordered").find(".tal").eq(2).text()+'역 정차)</span>');
		$realLoc.find(".showLocPrice").html( $("#hdStaSubwayShowLoc .showLocDummy .bordered").find(".tal").eq(1).html().replace("(","<br/>(") );
		$realLoc.find(".showLocPrice").find("li").each(function(){
			$(this).find(".bdg-1").after('<span class="bdg-2">현금</span>');
		})

		
	}).fail(function(){
		viewCommBox("최단경로를 찾는데 실패했습니다.");
		$(".loaders").fadeOut(100);
	}).done(function(){
		$("#hdStaSubwayShowLoc").fadeIn(100);
		$(".btnFindLoc").addClass("on");
		$(".loaders").fadeOut(100);
	});

}

// 스타일이 정상 출력되지 않는 경전철을 위한 예외처리
function excLrtOutput(type,idx,line){
	
	var val;
	var $realLoc = $("#hdStaSubwayShowLoc").find(".showLocInfo");	

	// 타입을 결정합니다.
	if ( type == 'start' ){
		val = appVar.stationStart;	
	}else{
		val = appVar.stationEnd;	
	}

	// 경전철 예외 처리
	if ( parseInt(val,10) > 4599 && parseInt(val,10) < 4700 ){ // ULINE
		$realLoc.find(".showLocMap ul li").eq(idx).find(".lineNum").addClass("r51");
		$realLoc.find(".showLocMap ul li").eq(idx).find(".tit span").html("(의정부경전철/ULINE)");					
		if ( line ){
			$realLoc.find(".showLocMap ul").append('<li><div class="line l51"></div></li>');
		}
	}

	if ( parseInt(val,10) > 4499 && parseInt(val,10) < 4600 ){ // EVERLINE
		$realLoc.find(".showLocMap ul li").eq(idx).find(".lineNum").addClass("r52");
		$realLoc.find(".showLocMap ul li").eq(idx).find(".tit span").html("(용인경전철/EVERLINE)");					
		if ( line ){
			$realLoc.find(".showLocMap ul").append('<li><div class="line l52"></div></li>');
		}
	}	

}

// 출발, 도착역 정보를 초기화 합니다.
function resetStation(){

	// 설정된 역 정보를 없앰
	appVar.stationStart = null;
	appVar.stationEnd = null;

	// 페이지에 보여주는 정보도 지움
	$("#hdStaSubwayLoc .txtStation").html("미지정");
	$("#hdStaSubwayMapSelLine .btnInfoClose").click();
	$(".btnFindLoc").removeClass("on");
	viewCommBox('출발/도착역이 초기화 되었습니다.');

}

// 맵의 확대,축소 함수
function mapScaleUp(val){
	var $target = $("#hdStaSubwayMapAll svg");

	if ( val ){
		if ( $target.width() < 4000 ){
			$target.css({"width":$target.width() * 1.2 ,"height":$target.height() * 1.2});
		}else{
			viewCommBox('노선도 확대치가 최대 입니다.');
		}
	}else{
		if ( $target.width() > 1401 ){
			$target.css({"width":$target.width() * .8 ,"height":$target.height() * .8});
		}else{
			viewCommBox('노선도 확대치 기본값 입니다.');
		}
	}

	$("#hdStaSubwayMapAll").scrollLeft( $target.width() * .4 );
	$("#hdStaSubwayMapAll").scrollTop( $target.height() * .4 );

}


// <!-- S : 실시간 열차 위치 보기  v1.3.0.150720 추가 -->

// 노선별 열차의 위치를 받아 오는 함수
function releaseTrainPos(lineNum,posName){

	// 기준역 인덱스를 저장할 변수 
	var idx = 0;

	// Loader를 실행합니다.
	$(".loaders").fadeIn(100);
	// 새로고침 버튼을 활성화 합니다.
	$("#hdStaSwPosMenu .btnRefreshArea").addClass("on");
	// 노선선택 메뉴가 펼쳐져 있다면 닫습니다.
	$(".swPosExtMenu").css("display","none");
	// // 최상단으로 이동시킵니다.
	// $("body,html").scrollTop(0);

	// 기준역을 설정합니다.
	if ( posName != false ){
		appVar.trainPosName = posName.replace(/ /g,"");
	}else{
		appVar.trainPosName = $(event.target).parent().parent().find(".stationName").text();
	}
	
	// 지원하지 않는 경전철 , 인천지하철은 표시하지 않습니다.
	if ( lineNum == "0116" || lineNum == "0119") lineNum = 1001;
	
	// 서울도로교통공단 서버를 통해 열차 위치를 넘겨 받습니다.
	$.post("http://m.bus.go.kr/mBus/subway/getStatnByRoute.bms",{
		subwayId : lineNum
	},function(data,status){

		// 정상일때 
		if ( data.error.errorCode == "0000" ){

			// 노선코드를 공통 변수에 넣어줍니다.
			appVar.trainPosLine = lineNum;

			// 데이터를 찾으면 기존내용을 지웁니다.
			$("#hdStaSwPos ul").remove();
			// 데이터를 넣을 리스트를 생성합니다.
			$("#hdStaSwPos").append('<ul class="line'+lineNum+'"></ul>');
			// 노선 선택 메뉴를 모두 비활성화 합니다.
			$(".swPosExtMenu ul li").removeClass("on");
			// 노선 선택 메뉴에 선택된 노선을 활성화 합니다.
			$(".swPosExtMenu ul").find(".line"+lineNum).toggleClass("on");
			// 상단에 노선명을 출력합니다.
			$("#hdStaSwPosMenu .swPosMenuTxt .line_num").html(lineDiv(lineNum));

			// 검색된 리스트를 탐색합니다.
			for(var i = 0 ; i < data.resultList.length ; i++ ){
				// console.log(appVar.trainPosName +","+data.resultList[i].statnNm );
				// 인덱스를 찾습니다.
				if ( appVar.trainPosName == data.resultList[i].statnNm ){
					idx = i;
				}

				// 역정보를 생성합니다.
				$("#hdStaSwPos ul").append(''
				+'<li>'
				+'	<div class="trainArr trainArrDown">'
				+'		<div class="icoTrain"></div>'
				+'		<div class="icoTrainBack"></div>'
				+'		<div class="icoExpress font_nanumBarunL">급</div>'
				+'		<div class="lineArr"></div>'
				+'	</div>'
				+'	<div class="trainArr trainArrUp">'
				+'		<div class="icoTrain"></div>'
				+'		<div class="icoTrainBack"></div>'
				+'		<div class="icoExpress font_nanumBarunL">급</div>'
				+'		<div class="lineArr"></div>'
				+'	</div>'
				+'	<div class="trainArrStation">'
				+'		<div class="stationName font_nanumBarunL">'+staNameDiv(data.resultList[i].statnNm)+'</div>'
				+'		<div class="staNameEng font_GothamL">'+staId2Code(data.resultList[i])+'</div>'
				+'		<div class="transferLine"></div>'
				+'	</div>'
				+'</li>'
				+'');

				// 하행선
				if ( data.resultList[i].existYn1 != "N" ){
					$("#hdStaSwPos ul li").eq(i).find(".trainArrDown").addClass("on");
					if ( data.resultList[i].existYn1 == "T" ){
						$("#hdStaSwPos ul li").eq(i).find(".trainArrDown .icoExpress").addClass("on");
					}
				}
				// 상행선
				if ( data.resultList[i].existYn2 != "N" ){
					$("#hdStaSwPos ul li").eq(i).find(".trainArrUp").addClass("on");
					if ( data.resultList[i].existYn2 == "T" ){
						$("#hdStaSwPos ul li").eq(i).find(".trainArrUp .icoExpress").addClass("on");
					}
				}

				// 환승역의 경우 연결 버튼을 생성합니다.ㄴ
				if ( data.resultList[i].statnTrnsit != lineNum ){
					var tmp = data.resultList[i].statnTrnsit.split(",");
					for( var j = 0 ; j < tmp.length ; j++ ){
						if ( tmp[j] != lineNum ){
							$("#hdStaSwPos ul li").eq(i).find(".transferLine").append(''
								+'<div class="btnEnterLine line'+tmp[j]+' font_GothamL2" onclick="releaseTrainPos('+tmp[j]+',false)">'+lineDiv(tmp[j])+'</div>'
								+'');
						}

					}
				}
			}
		
		}else{
			viewCommBox("실시간 열차 위치를 찾는데 실패했습니다.");	
		}
		
	}).fail(function(){
		viewCommBox("실시간 열차 위치를 찾는데 실패했습니다.");
		$("#hdStaSwPosMenu .btnRefreshArea").removeClass("on");
		$(".loaders").fadeOut(100);
	}).done(function(){
		$(".loaders").fadeOut(100);
		$("#hdStaSwPosMenu .btnRefreshArea").removeClass("on");

		// 기준역이 가운데 오게 설정
		$("body,html").scrollTop($("#hdStaSwPos ul li").eq(idx).offset().top - ($("body,html").height() / 2)) - 90;

		// 예외처리 시작
			// 경춘선에 광운대역이 등장하는것 제거
			if ( lineNum === 1067 ){
				$("#hdStaSwPos ul li").eq(0).remove();
			}
	});

}

// 역아이디를 역코드로 변경
function staId2Code(val){

	var tmp = val.statnId.split(val.subwayId);	
	result = String(parseInt(tmp[1],10));

	// 
	if ( val.subwayId != "1077" && val.subwayId != "1065" ){
		if ( String(parseInt(tmp[1],10)).length == 5 ){ // 			
			result = result.replace(result.substr(0,2),String.fromCharCode(result.substr(0,2)));
		}else if ( String(parseInt(tmp[1],10)).length == 4 ){
			result = result.substr(0,3)+"-"+result.substr(3,1);
		}
	}else{

		result = result.replace(result.substr(0,2),String.fromCharCode(result.substr(0,2)));

		// 신분당선		
		if ( val.subwayId == "1077" ){
			if ( result.length < 3 ) result = result.substr(0,1) + "0" + result.substr(1,1);
		}

	}
	
	return $("#hdStaSubwayMapSelLine .selLine ul").find(".selLine"+result).find(".staEngName").html();

}

// 역명 치환
function staNameDiv(val){
	var tmp;
	if ( val.indexOf("(") > -1 ){
		tmp = val.split("(");
		return tmp[0]+'<span class="stationSubName">&nbsp;('+tmp[1]+'</span>';
	}else{
		return val;
	}
}

// 호선명 치환
function lineDiv(val){

	switch (parseInt(val,10)){
		case 1001 : return "1호선"; break;
		case 1002 : return "2호선"; break;
		case 1003 : return "3호선"; break;
		case 1004 : return "4호선"; break;
		case 1005 : return "5호선"; break;
		case 1006 : return "6호선"; break;
		case 1007 : return "7호선"; break;
		case 1008 : return "8호선"; break;
		case 1009 : return "9호선"; break;
		case 1075 : return "분당선"; break;
		case 1063 : return "경의중앙선 ";break;
		case 1077 : return "신분당선" ;break;
		case 1069 : return "인천1호선 ";break;
		case 1065 : return "공항철도" ;break;
		case 1067 : return "경춘선"; break;
		case 1071 : return "수인선"; break;
		default : return false;
	}

}