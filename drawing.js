var canvas, checkbox;
var gl = null;

var lastUpdateTime = (new Date).getTime();

var	shaderProgram = new Array(2); //Two handles, one for each shaders' couple. 0 = goureaud; 1 = phong
	
var shaderDir = "http://127.0.0.1:8887/shaders/";	
var modelsDir = "http://127.0.0.1:8887/models/";
	
var perspectiveMatrix,
	viewMatrix;

var vertexNormalHandle = new Array(2);
var vertexPositionHandle = new Array(2);
var vertexUVHandle = new Array(2);
var textureFileHandle = new Array(2);
var textureInfluenceHandle = new Array(2);
var ambientLightInfluenceHandle = new Array(2);
var ambientLightColorHandle = new Array(2);

var matrixPositionHandle = new Array(2);
var	materialDiffColorHandle = new Array(2);
var lightDirectionHandle = new Array(2);
var lightPositionHandle = new Array(2);
var lightColorHandle  = new Array(2);
var lightTypeHandle = new Array(2);
var	eyePositionHandle = new Array(2);
var materialSpecColorHandle = new Array(2);
var materialSpecPowerHandle  = new Array(2);
var objectSpecularPower = 20.0;

// Parameters for light definition (directional light)
var dirLightAlpha = -utils.degToRad(60);
var dirLightBeta  = -utils.degToRad(120);
// Use the Utils 0.2 to use mat3
var lightDirection = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
					  Math.sin(dirLightAlpha),
					  Math.cos(dirLightAlpha) * Math.sin(dirLightBeta),
					  ];
var lightPosition = [0.0, 3.0, 0.0];					  
var lightColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);
var moveLight = 0; //0 : move the camera - 1 : move the lights

var sceneObjects; // Total number of nodes 
// The following arrays have sceneObjects as dimension.	
var vertexBufferObjectId = new Array();
var indexBufferObjectId =  new Array();
var objectWorldMatrix =    new Array();
var projectionMatrix =     new Array();
var facesNumber	=          new Array();
var diffuseColor =         new Array();	// Diffuse material colors of objs
var specularColor =        new Array();	
var diffuseTextureObj =    new Array();	// Texture material
var nTexture =             new Array();	// Number of textures per object				

// Scale parameter
scaleValue = 5.0;

// Parameters for camera (10/13/36) -20 -20
var cx = 10.0;
var cy = 13.0;
var cz = 36.0;
var elevation = -20.0;
var angle = -20.0;

var delta = 2.0;

// Parameters for handle1
var hx = 0.0;
var hy = 0.0;
var hz = 0.0;

// Eye parameters;
// We need now 4 eye vector, one for each cube
// As well as 4 light direction vectors for the same reason
var observerPositionObj = new Array();
var lightDirectionObj = new Array();
var lightPositionObj = new Array();

var currentLightType = 1;         
var currentShader = 0;         // Defines the current shader in use.
var textureInfluence = 1.0;
var ambientLightInfluence = 0.0;
var ambientLightColor = [1.0, 1.0, 1.0, 1.0];

function main(){

	canvas = document.getElementById("c");
	checkbox = document.getElementById("chbx");
	
	try {
		// Get canvas without alpha channel
		gl = canvas.getContext("webgl2", {alpha: false});
	} catch(e) {
		 console.log(e);
	}
	if (gl) {
		// Setting the size for the canvas equal to half the browser window
		// and other useful parameters
		var w = canvas.clientWidth;
		var h = canvas.clientHeight;
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.viewport(0.0, 0.0, w, h);
		gl.enable(gl.DEPTH_TEST);
		perspectiveMatrix = utils.MakePerspective(10, w/h, 0.1, 100.0);

		// Open the json file containing the 3D model to load,
		// parse it to retreive objects' data
		// and creates the VBO and IBO from them
		// The vertex format is (x, y, z, nx, ny, nz, u, v)
		loadModel("AirHockeyTable.json");
		
		// Load shaders' code
		// compile them
		// retrieve the handles
		loadShaders();
		
		// Setting up the interaction using keys (we use this to move the paddles)
		initInteraction();

		// Rendering cycle
		drawScene();

		
	} else {
		alert("Error: Your browser does not appear to support WebGL.");
	}
	
}

// Called when the slider for texture influence is changed
function updateTextureInfluence(val) {
	textureInfluence = val;
}

function updateLightType(val) {
	currentLightType = parseInt(val);
}

function updateLightMovement() {
	    if (checkbox.checked == true) {
            moveLight = 1;
        } else {
            moveLight = 0;
        }
}

function updateShader(val) {
	currentShader = parseInt(val);
}

function updateAmbientLightInfluence(val) {
	ambientLightInfluence = val;
}

function updateAmbientLightColor(val) {
	val = val.replace('#','');
	ambientLightColor[0] = parseInt(val.substring(0,2), 16) / 255;
	ambientLightColor[1] = parseInt(val.substring(2,4), 16) / 255;
	ambientLightColor[2] = parseInt(val.substring(4,6), 16) / 255;
	ambientLightColor[3] = 1.0;
}

function loadShaders(){
		
		utils.loadFiles([shaderDir + 'vs_p.glsl',
						 shaderDir + 'fs_p.glsl',
						 shaderDir + 'vs_g.glsl',
						 shaderDir + 'fs_g.glsl'
						 ], 
						 function(shaderText){
							// odd numbers are VSs, even are FSs
							var numShader = 0;
							for (i = 0; i < shaderText.length; i += 2) {
								var vertexShader = gl.createShader(gl.VERTEX_SHADER);
								gl.shaderSource(vertexShader, shaderText[i]);
								gl.compileShader(vertexShader);
								if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
									alert("ERROR IN VS SHADER : "+gl.getShaderInfoLog(vertexShader));
								}
								var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
								gl.shaderSource(fragmentShader, shaderText[i+1]);
								gl.compileShader(fragmentShader);
								if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
									alert("ERROR IN FS SHADER : "+gl.getShaderInfoLog(fragmentShader));
								}
								shaderProgram[numShader] = gl.createProgram();
								gl.attachShader(shaderProgram[numShader], vertexShader);
								gl.attachShader(shaderProgram[numShader], fragmentShader);
								gl.linkProgram(shaderProgram[numShader]);
								if (!gl.getProgramParameter(shaderProgram[numShader], gl.LINK_STATUS)) {
									alert("Unable to initialize the shader program...");
								}
								numShader++;
							}	
						});
			
		// Getting the handles to the shaders' vars
		
		for (i = 0; i < 2; i++) {
			vertexPositionHandle[i] = gl.getAttribLocation(shaderProgram[i], 'inPosition');
			vertexNormalHandle[i] = gl.getAttribLocation(shaderProgram[i], 'inNormal');
			vertexUVHandle[i] = gl.getAttribLocation(shaderProgram[i], 'inUVs');
			
			matrixPositionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'wvpMatrix');
			
			materialDiffColorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'mDiffColor');
			materialSpecColorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'mSpecColor');
			materialSpecPowerHandle[i] = gl.getUniformLocation(shaderProgram[i], 'mSpecPower');
			textureFileHandle[i] = gl.getUniformLocation(shaderProgram[i], 'textureFile');

			textureInfluenceHandle[i] = gl.getUniformLocation(shaderProgram[i], 'textureInfluence');
			ambientLightInfluenceHandle[i] = gl.getUniformLocation(shaderProgram[i], 'ambientLightInfluence');
			ambientLightColorHandle[i]= gl.getUniformLocation(shaderProgram[i], 'ambientLightColor');
			
			eyePositionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'eyePosition');
			
			lightDirectionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightDirection');
			lightPositionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightPosition');
			lightColorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightColor');
			lightTypeHandle[i]= gl.getUniformLocation(shaderProgram[i],'lightType');		
		}
}


function loadModel(modelName) {

		utils.get_json(modelsDir + modelName, function(loadedModel) {
				
			sceneObjects = loadedModel.meshes.length;
				
				console.log("Found " + sceneObjects + " objects...");
				
				// Preparing to store objects' world matrix and the lights and material properties per object 
				for (i = 0; i < sceneObjects; i++) {
					objectWorldMatrix[i] = new utils.identityMatrix();
					projectionMatrix[i] =  new utils.identityMatrix();
					diffuseColor[i] = [1.0, 1.0, 1.0, 1.0];	
					specularColor[i] = [1.0, 1.0, 1.0, 1.0];	
					observerPositionObj[i] = new Array(3);		
					lightDirectionObj[i] = new Array(3);
					lightPositionObj[i]	= new Array(3);				
				}
				
				for (i = 0; i < sceneObjects; i++) { 
					
					// Creating the vertex data
					console.log("Object[" + i + "]:");
					console.log("MeshName: "+ loadedModel.rootnode.children[i].name);
					console.log("Vertices: "+ loadedModel.meshes[i].vertices.length);			
					console.log("Normals: "+ loadedModel.meshes[i].normals.length);		
					if (loadedModel.meshes[i].texturecoords){
						console.log("UVss: " + loadedModel.meshes[i].texturecoords[0].length);
					} else {
						console.log("No UVs for this mesh!");
					}

					var meshMatIndex = loadedModel.meshes[i].materialindex;
					
					var UVFileNamePropertyIndex = -1;
					var diffuseColorPropertyIndex = -1;
					var specularColorPropertyIndex = -1;
					for (n = 0; n < loadedModel.materials[meshMatIndex].properties.length; n++){
						if(loadedModel.materials[meshMatIndex].properties[n].key == "$tex.file") UVFileNamePropertyIndex = n;
						if(loadedModel.materials[meshMatIndex].properties[n].key == "$clr.diffuse") diffuseColorPropertyIndex = n;
						if(loadedModel.materials[meshMatIndex].properties[n].key == "$clr.specular") specularColorPropertyIndex = n;
					}

					
					// Getting vertex and normals					
					var objVertex = [];		
					for (n = 0; n < loadedModel.meshes[i].vertices.length/3; n++){
						objVertex.push(loadedModel.meshes[i].vertices[n*3], 
									   loadedModel.meshes[i].vertices[n*3+1],
									   loadedModel.meshes[i].vertices[n*3+2]);
						objVertex.push(loadedModel.meshes[i].normals[n*3], 
									   loadedModel.meshes[i].normals[n*3+1],
									   loadedModel.meshes[i].normals[n*3+2]);									   
						if (UVFileNamePropertyIndex >= 0) { // True if a texture is present
							objVertex.push( loadedModel.meshes[i].texturecoords[0][n*2],
											loadedModel.meshes[i].texturecoords[0][n*2+1]);
						} else {
							objVertex.push( 0.0, 0.0);
						}
					}
					
					facesNumber[i] = loadedModel.meshes[i].faces.length;
					console.log("Face Number: " + facesNumber[i]);
					
					s = 0;		
					
					if (UVFileNamePropertyIndex >= 0) {
						
						nTexture[i] = true;
						
						console.log(loadedModel.materials[meshMatIndex].properties[UVFileNamePropertyIndex].value);
						// In our case 'airhockey-background.png'
						var imageName = loadedModel.materials[meshMatIndex].properties[UVFileNamePropertyIndex].value;
						
						var getTexture = function(image_URL) {
							var image = new Image();
							image.webglTexture=false;
  						
						  	requestCORSIfNotSameOrigin(image, image_URL);

							image.onload = function(e) {

								var texture = gl.createTexture();
								
								gl.bindTexture(gl.TEXTURE_2D, texture);
								
								gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
								gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
								gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
								gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
								gl.generateMipmap(gl.TEXTURE_2D);
								
								gl.bindTexture(gl.TEXTURE_2D, null);
								image.webglTexture = texture;
							};
							
							image.src=image_URL;

							return image;
						};
							
						diffuseTextureObj[i] = getTexture(modelsDir + imageName);

						console.log("TXT filename: " + diffuseTextureObj[i]);
						console.log("TXT src: " + diffuseTextureObj[i].src);
						console.log("TXT loaded?: " + diffuseTextureObj[i].webglTexture);
					
					} else { 
						nTexture[i] = false;
					}
					
					// Mesh color
					diffuseColor[i] = loadedModel.materials[meshMatIndex].properties[diffuseColorPropertyIndex].value; // Diffuse value
				
					diffuseColor[i].push(1.0); // Alpha value added
					
					specularColor[i] = loadedModel.materials[meshMatIndex].properties[specularColorPropertyIndex].value;
					console.log("Specular: " + specularColor[i]);
				
					// Vertices, normals and UV set 1
					vertexBufferObjectId[i] = gl.createBuffer();
					gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObjectId[i]);
					gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(objVertex), gl.STATIC_DRAW);
							 
					// Creating index buffer
					facesData = [];				 
					for (n = 0; n < loadedModel.meshes[i].faces.length; n++) {
						facesData.push( loadedModel.meshes[i].faces[n][0],
										loadedModel.meshes[i].faces[n][1],
										loadedModel.meshes[i].faces[n][2]
										);
					}
					
					indexBufferObjectId[i] = gl.createBuffer ();
					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObjectId[i]);
					gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facesData),gl.STATIC_DRAW);
							  
				
					// Creating the objects' world matrix
					objectWorldMatrix[i] = loadedModel.rootnode.children[i].transformation;
					
					// Correcting the orientation
					objectWorldMatrix[i] = utils.multiplyMatrices(
											objectWorldMatrix[i],
											utils.MakeRotateYMatrix(-108));	

					objectWorldMatrix[i] = utils.multiplyMatrices(
											objectWorldMatrix[i],
											utils.MakeRotateZMatrix(-5));
					
					objectWorldMatrix[i] = utils.multiplyMatrices(
											objectWorldMatrix[i],
											utils.MakeTranslateMatrix(0, 0, -2.5));

					objectWorldMatrix[i] = utils.multiplyMatrices(
											objectWorldMatrix[i],
											utils.MakeScaleMatrix(scaleValue));
				} 
			});
}

function initInteraction() {

		var keyFunction = function(e) {
			if (e.keyCode == 37) {	// Left arrow
				if (moveLight == 0) cx -= delta;
				else lightPosition[0] -= delta;
			}
			if (e.keyCode == 39) {	// Right arrow
				if (moveLight == 0)cx  += delta;
				else lightPosition[0] += delta;
			}	
			if (e.keyCode == 38) {	// Up arrow
				if (moveLight == 0)  cz -= delta;
				else lightPosition[2] -= delta;
			}
			if (e.keyCode == 40) {	// Down arrow
				if (moveLight == 0)  cz += delta;
				else lightPosition[2] += delta;
			}
			if (e.keyCode == 107) {	// Add
				if (moveLight == 0)  cy += delta;
				else lightPosition[1] += delta;
			}
			if (e.keyCode == 109) {	// Subtract
				if (moveLight == 0)  cy -= delta;
				else lightPosition[1] -= delta;
			}
			
			if (e.keyCode == 65) {	// a
				
			}
			if (e.keyCode == 68) {	// d
				
			}	
			if (e.keyCode == 87) {	// w
				console.log(hx);
				hx += 0.1;
				objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx, hy, hz));
			}
			if (e.keyCode == 83) {	// s
				
			}
		//console.log(" ("+cx + "/" + cy + "/" + cz + ") - "+ elevation + "." + angle);	
		}
		
		// 'window' is a JavaScript object (if "canvas", it will not work)
		window.addEventListener("keyup", keyFunction, false);
	}


function computeMatrices() {
	viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);
	
	var eyeTemp = [cx, cy, cz];
	
	for (i = 0; i < sceneObjects; i++) {
		projectionMatrix[i] = utils.multiplyMatrices(viewMatrix, objectWorldMatrix[i]);
		projectionMatrix[i] = utils.multiplyMatrices(perspectiveMatrix, projectionMatrix[i]);
		
		lightDirectionObj[i] = utils.multiplyMatrix3Vector3(utils.transposeMatrix3(utils.sub3x3from4x4(objectWorldMatrix[i])), lightDirection); 
		
		lightPositionObj[i] = utils.multiplyMatrix3Vector3(utils.invertMatrix3(utils.sub3x3from4x4(objectWorldMatrix[i])),lightPosition);
		
		observerPositionObj[i] = utils.multiplyMatrix3Vector3(utils.invertMatrix3(utils.sub3x3from4x4(objectWorldMatrix[i])), eyeTemp); 
	}
}

function animate() {
    var currentTime = (new Date).getTime();
    /*if (lastUpdateTime) {
      var deltaC = (30 * (currentTime - lastUpdateTime)) / 1000.0;
      hx += deltaC;
      hy -= deltaC;
      hz += deltaC;    
	}*/
    //objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx, hy, hz));
    lastUpdateTime = currentTime;               
  }
	
function drawScene() {

		animate();
		
		computeMatrices();

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.useProgram(shaderProgram[currentShader]);
		
		for (i = 0; i < sceneObjects; i++){
			gl.uniformMatrix4fv(matrixPositionHandle[currentShader], gl.FALSE, utils.transposeMatrix(projectionMatrix[i]));		
			
			gl.uniform1f(textureInfluenceHandle[currentShader], textureInfluence);
			gl.uniform1f(ambientLightInfluenceHandle[currentShader], ambientLightInfluence);	
			
			gl.uniform1i(textureFileHandle[currentShader], 0); // Texture channel 0 used for diff txt
			if (nTexture[i] == true && diffuseTextureObj[i].webglTexture) {
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, diffuseTextureObj[i].webglTexture);
			} 
			
			gl.uniform4f(lightColorHandle[currentShader], lightColor[0],
														  lightColor[1],
														  lightColor[2],
														  lightColor[3]);
			gl.uniform4f(materialDiffColorHandle[currentShader], diffuseColor[i][0],
																 diffuseColor[i][1],
																 diffuseColor[i][2],
																 diffuseColor[i][3]);
												  
			gl.uniform4f(materialSpecColorHandle[currentShader], specularColor[i][0],
																 specularColor[i][1],
																 specularColor[i][2],
																 specularColor[i][3]);
			gl.uniform4f(ambientLightColorHandle[currentShader], ambientLightColor[0],
																 ambientLightColor[1],
																 ambientLightColor[2],
																 ambientLightColor[3]);
					
			gl.uniform1f(materialSpecPowerHandle[currentShader], objectSpecularPower);
			
												  
			gl.uniform3f(lightDirectionHandle[currentShader], lightDirectionObj[i][0],
															  lightDirectionObj[i][1],
															  lightDirectionObj[i][2]);	
			gl.uniform3f(lightPositionHandle[currentShader], lightPositionObj[i][0],
															  lightPositionObj[i][1],
															  lightPositionObj[i][2]);
															  
			gl.uniform1i(lightTypeHandle[currentShader], currentLightType);

			gl.uniform3f(eyePositionHandle[currentShader],	observerPositionObj[i][0],
															observerPositionObj[i][1],
															observerPositionObj[i][2]);
														
			gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObjectId[i]);	
			
			gl.enableVertexAttribArray(vertexPositionHandle[currentShader]);
			gl.vertexAttribPointer(vertexPositionHandle[currentShader], 3, gl.FLOAT, gl.FALSE, 4 * 8, 0);
			
			gl.enableVertexAttribArray(vertexNormalHandle[currentShader]);
			gl.vertexAttribPointer(vertexNormalHandle[currentShader], 3, gl.FLOAT, gl.FALSE, 4 * 8, 4 * 3);	

			gl.vertexAttribPointer(vertexUVHandle[currentShader], 2, gl.FLOAT, gl.FALSE, 4*8, 4*6);                   
			gl.enableVertexAttribArray(vertexUVHandle[currentShader]);			
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObjectId[i]);
			gl.drawElements(gl.TRIANGLES, facesNumber[i] * 3, gl.UNSIGNED_SHORT, 0);
			
			gl.disableVertexAttribArray(vertexPositionHandle[currentShader]);
			gl.disableVertexAttribArray(vertexNormalHandle[currentShader]);
		}
		window.requestAnimationFrame(drawScene);
}

function requestCORSIfNotSameOrigin(img, url) {
  if ((new URL(url)).origin !== window.location.origin) {
    img.crossOrigin = "";
  }
}