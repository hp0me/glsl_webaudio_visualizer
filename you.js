window.onload = function(){

	//$('.youtube').bcYoutube().bcBackground();

	var audioCtx = new AudioContext();
	var analyser = audioCtx.createAnalyser();
	analyser.minDecibels = -90; //最小値
	analyser.maxDecibels = 0; //最大値
	analyser.smoothingTimeConstant = 0.75; //落ち着くまでの時間

	analyser.fftSize = 32; //音域の数
	var bufferLength = analyser.frequencyBinCount;
	var dataArray = new Uint8Array(bufferLength);
	analyser.getByteTimeDomainData(dataArray);

	var bufferLength = analyser.frequencyBinCount;

	//↓の配列に音域ごとの大きさが入る
	var dataArray = new Uint8Array(bufferLength);

	var source;

	//Youtubeの音を拾う
  navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia);
	navigator.getUserMedia (
	  {
	     audio: true,
       video: true
	  },
	  function(stream) {
	    source = audioCtx.createMediaStreamSource(stream);
	    source.connect(analyser);
      $("#myCamera").prop('src', window.URL.createObjectURL(stream));
			getAudio();
	  },
	  function(err) {
	     console.log(err);
	  }
	);

	//dataArrayに音域情報を入れる。繰り返す
	function getAudio() {
	  requestAnimationFrame(getAudio);
	  analyser.getByteFrequencyData(dataArray);
	}

	//シェーダー記述部分
	var canvas = document.getElementById("myCanvas");
	var gl = canvas.getContext("webgl");

	var buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,buf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0,-1,-1,0,1,1,0,1,-1,0]), gl.STATIC_DRAW);

	var fs = document.getElementById("fs").textContent;
	var vs = document.getElementById("vs").textContent;
	var fsh = gl.createShader(gl.FRAGMENT_SHADER);
	var vsh = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(fsh,fs);
	gl.shaderSource(vsh,vs);
	gl.compileShader(fsh);
	gl.compileShader(vsh);

	var programs = gl.createProgram();
	gl.attachShader(programs,fsh);
	gl.attachShader(programs,vsh);
	gl.linkProgram(programs);
	gl.useProgram(programs);

	//動的な値を登録
	var attribLoc = gl.getAttribLocation(programs, 'position');
  gl.enableVertexAttribArray(attribLoc);
  gl.vertexAttribPointer(attribLoc, 3, gl.FLOAT, false, 0, 0);
  var u = {};
  u.rad = gl.getUniformLocation(programs, 'rad');
  u.blueIntensity = gl.getUniformLocation(programs, 'blueIntensity');
  u.redIntensity = gl.getUniformLocation(programs, 'redIntensity');
  u.circleSize = gl.getUniformLocation(programs, 'circleSize');
  u.resolution = gl.getUniformLocation(programs, 'resolution');

  var rad = 0;
  var blueCount = 0;

  var render = function(){

    var x,y;
    canvas.width = x = window.innerWidth;
    canvas.height = y = window.innerHeight;
    gl.viewport(0, 0, x, y);

    //音域の総和を得る
    var dNum = 0;
    for(var i = 0; i < dataArray.length;i++){
      dataArray[i] *= 2.5;
    	dNum += dataArray[i];
    }

    //青は、総和をビジュアライズする
    var blue = dNum * 0.00023;
    //var blue = dNum * 0.0001 + 0.4;


    //赤は特定の音域のみ拾う
    var red = dataArray[6] * 0.002;
    //var red = 0;

    //◯の軌道。低い時は戻るようにする
    var vr = dataArray[6] * 0.0003;

    if(vr <= 0.04){
      vr -= 0.02;
    }else{
      vr += 0.04;
    }

    //vr > 0.08 ? blueCount++:blueCount=0;
    //if(blueCount > 3)red  = dataArray[5] * 0.003;

    //◯の大きさは青に比例する
    var circleSize = red * 0.01 +  blue * 0.04;

    rad += vr;

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.rad, rad);
    gl.uniform1f(u.circleSize, circleSize);
    gl.uniform1f(u.blueIntensity, blue);
    gl.uniform1f(u.redIntensity, red);
    gl.uniform2fv(u.resolution, [x, y]);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.flush();

    requestAnimationFrame(render);
  };

  render();

};

