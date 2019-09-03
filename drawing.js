var canvas, checkbox;
var gl = null;

var lastUpdateTime = (new Date).getTime();

var	shaderProgram = new Array(2); // Two handles, one for each shaders' couple. 0 = goureaud; 1 = phong

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
var moveLight = 0; // 0 : move the camera - 1 : move the lights

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

// Parameters for camera
var cx = 10.2;
var cy = 13.0;
var cz = 36.0;
var angle = -17;
var elevation = -20;
var FOV = 2; // Field Of View

var delta = 2.0;

// Parameters for handles & disk
var speedHandleLeftRight = 0.015;
var speedHandleUpDown = 0.015;
var speedDisk = 0.015;

//score
var player1 = 0;
var player2 = 0;
// Parameters for handle1
var hx1 = 0.0;
var hy1 = 0.0;
var hz1 = 0.0;

// Parameters for handle1
var hx2 = 0.0;
var hy2 = 0.0;
var hz2 = 0.0;

// Parameters for disk
var hx3 = 0.0;
var hy3 = 0.0;
var hz3 = 0.0;

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

function main() {

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
        gl.clearColor(0.9, 0.9, 0.9, 0);
        gl.viewport(0.0, 0.0, w, h);
        gl.enable(gl.DEPTH_TEST);

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

        // Setup slider for camera angle
        webglLessonsUI.setupSlider("#cameraAngle", {value: cameraAngleDeg, slide: updateCameraAngle, min: -180, max: 180, precision: 2, step: 0.001});

        // Setup slider for camera elevation
        webglLessonsUI.setupSlider("#cameraElevation", {value: cameraElevation, slide: updateCameraElevation, min: -180, max: 180, precision: 2, step: 0.001});

        // Setup slider for the field of view (FOV)
        webglLessonsUI.setupSlider("#fieldOfView", {value: cameraFOV, slide: updateFOV, min: -10, max: 10, precision: 2, step: 0.001});

    } else {
        alert("Error: Your browser does not appear to support WebGL.");
    }

}

// Default values for sliders
var cameraAngleDeg = -17;
var cameraElevation = -20;
var cameraFOV = 2;

// Function for the angle slider
function updateCameraAngle(event, ui) {
    cameraAngleDeg = (ui.value);
    angle = cameraAngleDeg;
}

// Function for the elevation slider
function updateCameraElevation(event, ui) {
    cameraElevation = (ui.value);
    elevation = -cameraElevation;
}

// Function for the FOV slider
function updateFOV(event, ui) {
    cameraFOV = (ui.value);
    FOV = cameraFOV;
}

// Change camera view (FRONT, TOP, BACK)
function updateCamera(choice) {
    if (choice == 0) {
        cameraAngleDeg = -17;
        cameraElevation = -20;
    } else if (choice == 1) {
        cameraElevation = -74;
    } else {
        cameraAngleDeg = 163;
        cameraElevation = -20;
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

function loadShaders() {

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
                    objVertex.push(0.0, 0.0);
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

            indexBufferObjectId[i] = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObjectId[i]);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facesData), gl.STATIC_DRAW);


            // Creating the objects' world matrix
            objectWorldMatrix[i] = loadedModel.rootnode.children[i].transformation;

            // Correcting the orientation
            //correctOrientation();
        }

        // Scale the objects
        //scaleObjects();
    });
}

function correctOrientation() {
    objectWorldMatrix[i] = utils.multiplyMatrices(
        objectWorldMatrix[i],
        utils.MakeRotateYMatrix(-107));

    // Inclinazione

    /*objectWorldMatrix[i] = utils.multiplyMatrices(
            objectWorldMatrix[i],
            utils.MakeRotateZMatrix(0));*/
}

function scaleObjects() {
    // Scale Paddles and Puck
    for (i = 0; i < sceneObjects - 1; i++) {
        objectWorldMatrix[i] = utils.multiplyMatrices(
            objectWorldMatrix[i],
            utils.MakeScaleMatrix(scaleValue - 1.5));
    }
    // Scale Table
    objectWorldMatrix[3] = utils.multiplyMatrices(
        objectWorldMatrix[i],
        utils.MakeScaleMatrix(scaleValue));
}

var pressed = true; // Used to move the paddles

function initInteraction() {

    var keyFunction = function(e) {

        if (e.keyCode == 37) {	// Left arrow
            if (moveLight == 0) angle -= delta*0.5;
            else lightPosition[0] -= delta;
        }
        if (e.keyCode == 39) {	// Right arrow
            if (moveLight == 0) angle  += delta*0.5;
            else lightPosition[0] += delta;
        }
        if (e.keyCode == 38) {	// Up arrow
            if (moveLight == 0)  elevation += delta*0.5;
            else lightPosition[2] -= delta;
        }
        if (e.keyCode == 40) {	// Down arrow
            if (moveLight == 0)  elevation -= delta*0.5;
            else lightPosition[2] += delta;
        }
        if (e.keyCode == 90) {	// Z
            if (moveLight == 0)  cy += delta;
            else lightPosition[1] += delta;
        }
        if (e.keyCode == 88) {	// X
            if (moveLight == 0)  cy -= delta;
            else lightPosition[1] -= delta;
        }

        if (e.keyCode == 65 ) {	// a
            resetValues1();
            hz1 -= speedHandleLeftRight;
        }
        if (e.keyCode == 68 ) {	// d
            resetValues1();
            hz1 += speedHandleLeftRight;
        }
        if (e.keyCode == 87 ) {	// w
            resetValues1();
            hx1 += speedHandleUpDown;
        }
        if (e.keyCode == 83) {	// s
            resetValues1();
            hx1 -= speedHandleUpDown;
        }

        if (e.keyCode == 76 ) {	// l
            resetValues2();
            hz2 -= speedHandleLeftRight;
        }
        if (e.keyCode == 74 ) {	// j
            resetValues2();
            hz2 += speedHandleLeftRight;
        }
        if (e.keyCode == 75 ) {	// k
            resetValues2();
            hx2 += speedHandleUpDown;
        }
        if (e.keyCode == 73) {	// i
            resetValues2();
            hx2 -= speedHandleUpDown;
        }
    }

    window.addEventListener("keydown", keyFunction, false);

    //in this way there aren't problem when a player press the keys meanwhile the other player isn't pressing the keys
    window.addEventListener('keyup', function(e) {

        if(e.keyCode>72 && e.keyCode<77)
        {
            pressed = false;
            resetValues2();
        }else{
            pressed = false;
            resetValues1();
        }
    });
}


function resetValues1() { // In this way I do not have to press the keys twice in order to change direction PAD1
    pressed = true;
    hx1 = 0;
    hy1 = 0;
    hz1 = 0;
}
function resetValues2() { // In this way I do not have to press the keys twice in order to change direction PAD2
    pressed = true;
    hx2 = 0;
    hy2 = 0;
    hz2 = 0;
}
function resetValues3(){
    hx3 = 0;
    hy3 = 0;
    hz3 = 0;

}

function computeMatrices() {

    //viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);
    var cameraMatrix = utils.MakeRotateYMatrix(cameraAngleDeg);
    cameraMatrix = utils.multiplyMatrices(cameraMatrix, utils.MakeRotateXMatrix(cameraElevation));
    cameraMatrix = utils.multiplyMatrices(cameraMatrix, utils.MakeTranslateMatrix(0, 0, 50));

    viewMatrix = utils.invertMatrix(cameraMatrix);

    perspectiveMatrix = utils.MakePerspective(FOV, canvas.clientWidth/canvas.clientHeight, 0.1, 100);

    var eyeTemp = [cx, cy, cz];

    for (i = 0; i < sceneObjects; i++) {
        projectionMatrix[i] = utils.multiplyMatrices(viewMatrix, objectWorldMatrix[i]);
        projectionMatrix[i] = utils.multiplyMatrices(perspectiveMatrix, projectionMatrix[i]);

        lightDirectionObj[i] = utils.multiplyMatrix3Vector3(utils.transposeMatrix3(utils.sub3x3from4x4(objectWorldMatrix[i])), lightDirection);

        lightPositionObj[i] = utils.multiplyMatrix3Vector3(utils.invertMatrix3(utils.sub3x3from4x4(objectWorldMatrix[i])), lightPosition);

        observerPositionObj[i] = utils.multiplyMatrix3Vector3(utils.invertMatrix3(utils.sub3x3from4x4(objectWorldMatrix[i])), eyeTemp);
    }
}

var isAnimation = false; // Default no animation

function startAnimation() {
    isAnimation = true;
}

// Reset everything to the initial position (also stops the animation)
function reset() {
    isAnimation = false;
    location.reload();
}

// Animation to rotate the table
function animate() {
    cameraAngleDeg += 0.1;
}


function padDiskImpact(){


    var c20 = Math.cos(28*Math.PI/180);
    var c40 = Math.cos(43*Math.PI/180);
    var c50 = Math.cos(53*Math.PI/180);
    var c70 = Math.cos(73*Math.PI/180);
    var c90 = Math.cos(90*Math.PI/180);
    var c110 = Math.cos(107*Math.PI/180);
    var c130 = Math.cos(127*Math.PI/180);
    var c140 = Math.cos(137*Math.PI/180);
    var c155 = Math.cos(152*Math.PI/180);


    //  DISK-PAD1
    if( ((((objectWorldMatrix[2][3] + 0.7) - objectWorldMatrix[0][3]) *  ((objectWorldMatrix[2][3] + 0.7) - objectWorldMatrix[0][3])) +
        (((objectWorldMatrix[2][11] + 0.03) - objectWorldMatrix[0][11] ) * ((objectWorldMatrix[2][11] + 0.03) - objectWorldMatrix[0][11] ))) < (0.1 * 0.1))
    {
        //0-90
        if((objectWorldMatrix[2][3] + 0.7 >= objectWorldMatrix[0][3]) && (objectWorldMatrix[2][11] + 0.03 <= objectWorldMatrix[0][11]))
        {
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 >= objectWorldMatrix[0][3] + 0.1 * c20))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0;
            }
            if( (objectWorldMatrix[2][3] + 0.7 >= 0.1 * c40 + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3] + 0.1 * c20))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * -0.5;
            }
            if( (objectWorldMatrix[2][3] + 0.7 >= 0.1 * c50  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3] + 0.1 * c40))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * -1;
            }
            if( (objectWorldMatrix[2][3] + 0.7 >= 0.1 * c70  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3] + 0.1 * c50))
            {
                resetValues3();
                hx3 = speedDisk * 0.5;
                hz3 = speedDisk * -1;
            }
            if( (objectWorldMatrix[2][3] + 0.7 >= 0.1 * c90  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3] + 0.1 * c70))
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * -1;
            }
        }

        //270-360
        if((objectWorldMatrix[2][3] + 0.7 >= objectWorldMatrix[0][3]) && (objectWorldMatrix[2][11] + 0.03 > objectWorldMatrix[0][11]))
        {
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 >= objectWorldMatrix[0][3] + 0.1 * c20))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0;
            }
            if( (objectWorldMatrix[2][3] + 0.7 >= 0.1 * c40 + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3] + 0.1 * c20))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0.5;
            }
            if( (objectWorldMatrix[2][3] + 0.7 >= 0.1 * c50  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3] + 0.1 * c40))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 1;
            }
            if( (objectWorldMatrix[2][3] + 0.7 >= 0.1 * c70  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3] + 0.1 * c50))
            {
                resetValues3();
                hx3 = speedDisk * 0.5;
                hz3 = speedDisk * 1;
            }
            if( (objectWorldMatrix[2][3] + 0.7 >= 0.1 * c90  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3] + 0.1 * c70))
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * 1;
            }
        }

        //90-180
        if((objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3]) && (objectWorldMatrix[2][11] + 0.03 <= objectWorldMatrix[0][11]))
        {
            if( (objectWorldMatrix[2][3] + 0.7 >= -0.1 + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 <= objectWorldMatrix[0][3] + 0.1 * c155))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0;
            }
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 * c140 + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 > objectWorldMatrix[0][3] + 0.1 * c155))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * -0.5;
            }
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 * c130  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 > objectWorldMatrix[0][3] + 0.1 * c140))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * -1;
            }
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 * c110  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 > objectWorldMatrix[0][3] + 0.1 * c130))
            {
                resetValues3();
                hx3 = speedDisk * -0.5;
                hz3 = speedDisk * -1;
            }
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 * c90  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 > objectWorldMatrix[0][3] + 0.1 * c110))
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * -1;
            }
        }

        //180-270
        if((objectWorldMatrix[2][3] + 0.7 < objectWorldMatrix[0][3]) && (objectWorldMatrix[2][11] + 0.03 > objectWorldMatrix[0][11]))
        {
            if( (objectWorldMatrix[2][3] + 0.7 >= -0.1 + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 <= objectWorldMatrix[0][3] + 0.1 * c155))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0;
            }
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 * c140 + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 > objectWorldMatrix[0][3] + 0.1 * c155))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0.5;
            }
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 * c130  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 > objectWorldMatrix[0][3] + 0.1 * c140))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 1;
            }
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 * c110  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 > objectWorldMatrix[0][3] + 0.1 * c130))
            {
                resetValues3();
                hx3 = speedDisk * -0.5;
                hz3 = speedDisk * 1;
            }
            if( (objectWorldMatrix[2][3] + 0.7 <= 0.1 * c90  + objectWorldMatrix[0][3])  && (objectWorldMatrix[2][3] + 0.7 > objectWorldMatrix[0][3] + 0.1 * c110))
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * 1;
            }
        }
    }

    //  DISK-PAD2
    if( ((((objectWorldMatrix[2][3] - 0.74) - objectWorldMatrix[1][3]) *  ((objectWorldMatrix[2][3] - 0.74) - objectWorldMatrix[1][3])) +
        (((objectWorldMatrix[2][11] + 0.03) - objectWorldMatrix[1][11] ) * ((objectWorldMatrix[2][11] + 0.03) - objectWorldMatrix[1][11] ))) < (0.1 * 0.1))
    {
        //0-90
        if((objectWorldMatrix[2][3] - 0.74 >= objectWorldMatrix[1][3]) && (objectWorldMatrix[2][11] + 0.03 <= objectWorldMatrix[1][11]))
        {
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 >= objectWorldMatrix[1][3] + 0.1 * c20))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0;
            }
            if( (objectWorldMatrix[2][3] - 0.74 >= 0.1 * c40 + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3] + 0.1 * c20))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * -0.5;
            }
            if( (objectWorldMatrix[2][3] - 0.74 >= 0.1 * c50  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3] + 0.1 * c40))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * -1;
            }
            if( (objectWorldMatrix[2][3] - 0.74 >= 0.1 * c70  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3] + 0.1 * c50))
            {
                resetValues3();
                hx3 = speedDisk * 0.5;
                hz3 = speedDisk * -1;
            }
            if( (objectWorldMatrix[2][3] - 0.74 >= 0.1 * c90  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3] + 0.1 * c70))
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * -1;
            }
        }

        //270-360
        if((objectWorldMatrix[2][3] - 0.74 >= objectWorldMatrix[1][3]) && (objectWorldMatrix[2][11] + 0.03 > objectWorldMatrix[1][11]))
        {
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 >= objectWorldMatrix[1][3] + 0.1 * c20))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0;
            }
            if( (objectWorldMatrix[2][3] - 0.74 >= 0.1 * c40 + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3] + 0.1 * c20))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0.5;
            }
            if( (objectWorldMatrix[2][3] - 0.74 >= 0.1 * c50  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3] + 0.1 * c40))
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 1;
            }
            if( (objectWorldMatrix[2][3] - 0.74 >= 0.1 * c70  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3] + 0.1 * c50))
            {
                resetValues3();
                hx3 = speedDisk * 0.5;
                hz3 = speedDisk * 1;
            }
            if( (objectWorldMatrix[2][3] - 0.74 >= 0.1 * c90  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3] + 0.1 * c70))
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * 1;
            }
        }

        //90-180
        if((objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3]) && (objectWorldMatrix[2][11] + 0.03 <= objectWorldMatrix[1][11]))
        {
            if( (objectWorldMatrix[2][3] - 0.74 >= -0.1 + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 <= objectWorldMatrix[1][3] + 0.1 * c155))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0;
            }
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 * c140 + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 > objectWorldMatrix[1][3] + 0.1 * c155))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * -0.5;
            }
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 * c130  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 > objectWorldMatrix[1][3] + 0.1 * c140))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * -1;
            }
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 * c110  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 > objectWorldMatrix[1][3] + 0.1 * c130))
            {
                resetValues3();
                hx3 = speedDisk * -0.5;
                hz3 = speedDisk * -1;
            }
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 * c90  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 > objectWorldMatrix[1][3] + 0.1 * c110))
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * -1;
            }
        }

        //180-270
        if((objectWorldMatrix[2][3] - 0.74 < objectWorldMatrix[1][3]) && (objectWorldMatrix[2][11] + 0.03 > objectWorldMatrix[1][11]))
        {
            if( (objectWorldMatrix[2][3] - 0.74 >= -0.1 + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 <= objectWorldMatrix[1][3] + 0.1 * c155))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0;
            }
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 * c140 + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 > objectWorldMatrix[1][3] + 0.1 * c155))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0.5;
            }
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 * c130  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 > objectWorldMatrix[1][3] + 0.1 * c140))
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 1;
            }
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 * c110  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 > objectWorldMatrix[1][3] + 0.1 * c130))
            {
                resetValues3();
                hx3 = speedDisk * -0.5;
                hz3 = speedDisk * 1;
            }
            if( (objectWorldMatrix[2][3] - 0.74 <= 0.1 * c90  + objectWorldMatrix[1][3])  && (objectWorldMatrix[2][3] - 0.74 > objectWorldMatrix[1][3] + 0.1 * c110))
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * 1;
            }
        }
    }
}

function padsMove(){

    //         Move the paddle 1 with control

    if (pressed && hx1>0 && objectWorldMatrix[0][3]<= 0.63 && hz1==0) {
        objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
    }

    if(objectWorldMatrix[0][3]<= 0.64 && objectWorldMatrix[0][3]>0.06){

        if (pressed && hz1>0 && objectWorldMatrix[0][11]<= 0.41 && hx1==0) {
            objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
        }
        if (pressed && hz1<0 && objectWorldMatrix[0][11]>= -0.35 && hx1==0) {
            objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
        }
        if (pressed && hx1<0 && hz1==0  && objectWorldMatrix[0][3]>= -0.09 ) {
            objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
        }

    }
    if(objectWorldMatrix[0][3]<= 0.06 && objectWorldMatrix[0][3]>= -0.15)
    {
        if(objectWorldMatrix[0][11]< -0.19){

            if (pressed && hz1>0 && objectWorldMatrix[0][11]<= 0.41 && hx1==0) {
                objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
            }
            if (pressed && ((hx1<0 && hz1==0 && objectWorldMatrix[0][3]>= -0.09 )||(hx1==0 && hz1<0 && objectWorldMatrix[0][11]>= -0.35))
                && (((0.06 - objectWorldMatrix[0][3]) * (0.06 - objectWorldMatrix[0][3])) + (( -0.19 - objectWorldMatrix[0][11]) * ( -0.19 - objectWorldMatrix[0][11])) <= (0.17*0.17))  ) {
                objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
            }
        }

        if(objectWorldMatrix[0][11]>= -0.19 && objectWorldMatrix[0][11]<= 0.25){

            if (pressed && hz1>0 && objectWorldMatrix[0][11]<= 0.41 && hx1==0) {
                objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
            }
            if (pressed && hz1<0 && objectWorldMatrix[0][11]>= -0.35 && hx1==0) {
                objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
            }
            if (pressed && hx1<0 && hz1==0 && objectWorldMatrix[0][3]>= -0.09 ) {
                objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
            }
        }

        if(objectWorldMatrix[0][11]> 0.25){

            if (pressed && hz1<0 && objectWorldMatrix[0][11]>= -0.35 && hx1==0) {
                objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
            }
            if (pressed && ((hx1<0 && hz1==0 && objectWorldMatrix[0][3]>= -0.09 ) || (hx1==0 && hz1>0 && objectWorldMatrix[0][11]<= 0.41))
                && (((0.06 - objectWorldMatrix[0][3]) * (0.06 - objectWorldMatrix[0][3])) + (( 0.25 - objectWorldMatrix[0][11]) * ( 0.25 - objectWorldMatrix[0][11])) <= (0.17 * 0.17))  ) {
                objectWorldMatrix[0] = utils.multiplyMatrices(objectWorldMatrix[0], utils.MakeTranslateMatrix(hx1, hy1, hz1));
            }
        }

    }

    //     Move the paddle 2 with control

    if (pressed && hx2<0 && objectWorldMatrix[1][3]> -0.67 && hz2==0) {
        objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
    }

    if(objectWorldMatrix[1][3]>= -0.68 && objectWorldMatrix[1][3]< -0.1){

        if (pressed && hz2>0 && objectWorldMatrix[1][11]<= 0.41 && hx2==0) {
            objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
        }
        if (pressed && hz2<0 && objectWorldMatrix[1][11]>= -0.35 && hx2==0) {
            objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
        }
        if (pressed && hx2>0 && hz2==0  && objectWorldMatrix[1][3]<= 0.06 ) {
            objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
        }

    }
    if(objectWorldMatrix[1][3]>= -0.1 && objectWorldMatrix[1][3]<= 0.11)
    {
        if(objectWorldMatrix[1][11]< -0.19){

            if (pressed && hz2>0 && objectWorldMatrix[1][11]<= 0.41 && hx2==0) {
                objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
            }
            if (pressed && ((hx2>0 && hz2==0 && objectWorldMatrix[1][3]<= 0.06 )||(hx2==0 && hz2<0 && objectWorldMatrix[1][11]>= -0.35))
                && (((-0.1 - objectWorldMatrix[1][3]) * (-0.1 - objectWorldMatrix[1][3])) + (( -0.19 - objectWorldMatrix[1][11]) * ( -0.19 - objectWorldMatrix[1][11])) <= (0.17*0.17))  ) {
                objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
            }
        }

        if(objectWorldMatrix[1][11]>= -0.19 && objectWorldMatrix[1][11]<= 0.25){

            if (pressed && hz2>0 && objectWorldMatrix[1][11]<= 0.41 && hx2==0) {
                objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
            }
            if (pressed && hz2<0 && objectWorldMatrix[1][11]>= -0.35 && hx2==0) {
                objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
            }
            if (pressed && hx2>0 && hz2==0 && objectWorldMatrix[1][3]<= 0.06 ) {
                objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
            }
        }

        if(objectWorldMatrix[1][11]> 0.25){

            if (pressed && hz2<0 && objectWorldMatrix[1][11]>= -0.35 && hx2==0) {
                objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
            }
            if (pressed && ((hx2>0 && hz2==0 && objectWorldMatrix[1][3]<= 0.06 ) || (hx2==0 && hz2>0 && objectWorldMatrix[1][11]<= 0.41))
                && (((-0.1 - objectWorldMatrix[1][3]) * (-0.1 - objectWorldMatrix[1][3])) + (( 0.25 - objectWorldMatrix[1][11]) * ( 0.25 - objectWorldMatrix[1][11])) <= (0.17 * 0.17))  ) {
                objectWorldMatrix[1] = utils.multiplyMatrices(objectWorldMatrix[1], utils.MakeTranslateMatrix(hx2, hy2, hz2));
            }
        }
    }

}

function goal(){
    resetValues1();
    resetValues2();
    resetValues3();
    for(i=0;i<3;i++){
        objectWorldMatrix[i][3] = 0;
        objectWorldMatrix[i][11] = 0;
    }
}

function diskTableImpact(){

    var s20 = Math.sin(20*Math.PI/180);
    var s40 = Math.sin(40*Math.PI/180);
    var s50 = Math.sin(50*Math.PI/180);
    var s70 = Math.sin(70*Math.PI/180);
    var s90 = Math.sin(90*Math.PI/180);

    // disk - table curve
    //up-left
    if( objectWorldMatrix[2][11] <= -0.224 && objectWorldMatrix[2][3] <= -0.645)
    {
        if( (((objectWorldMatrix[2][11] - (-0.225)) * (objectWorldMatrix[2][11] - (-0.225))) + ((objectWorldMatrix[2][3] - (-0.645)) * (objectWorldMatrix[2][3] - (-0.645))) ) >= (0.195 * 0.195) )
        {
            if( objectWorldMatrix[2][11] <= -0.225 && ( objectWorldMatrix[2][11] > -0.2 * s20 - 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0;
            }
            if( ( objectWorldMatrix[2][11] <= -0.2 * s20  - 0.225) && ( objectWorldMatrix[2][11] > -0.2 * s40  - 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0.5;
            }
            if( ( objectWorldMatrix[2][11] <= -0.2 * s40  - 0.225) && ( objectWorldMatrix[2][11] > -0.2 * s50  - 0.225)  )
            {
                resetValues3();
                hx3 += speedDisk;
                hz3 += speedDisk;
            }
            if( ( objectWorldMatrix[2][11] <= -0.2 * s50  - 0.225) && ( objectWorldMatrix[2][11] > -0.2 * s70  - 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 0.5;
                hz3 = speedDisk * 1;
            }
            if( ( objectWorldMatrix[2][11] <= -0.2 * s70  - 0.225) && ( objectWorldMatrix[2][11] >= -0.2 * s90  - 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * 1;
            }
        }
    }

    //up right
    if( objectWorldMatrix[2][11] <= -0.224 && objectWorldMatrix[2][3] >= 0.645)
    {
        if( (((objectWorldMatrix[2][11] - (-0.225)) * (objectWorldMatrix[2][11] - (-0.225))) + ((objectWorldMatrix[2][3] - 0.645) * (objectWorldMatrix[2][3] - 0.645)) ) >= (0.195 * 0.195) )
        {
            if( objectWorldMatrix[2][11] <= -0.225 && ( objectWorldMatrix[2][11] > -0.2 * s20 - 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0;
            }
            if( ( objectWorldMatrix[2][11] <= -0.2 * s20  - 0.225) && ( objectWorldMatrix[2][11] > -0.2 * s40  - 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0.5;
            }
            if( ( objectWorldMatrix[2][11] <= -0.2 * s40  - 0.225) && ( objectWorldMatrix[2][11] >=-0.2 * s50  - 0.225)  )
            {
                resetValues3();
                hx3 -= speedDisk;
                hz3 += speedDisk;
            }
            if( ( objectWorldMatrix[2][11] <= -0.2 * s50  - 0.225) && ( objectWorldMatrix[2][11] > -0.2 * s70  - 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * -0.5;
                hz3 = speedDisk * 1;
            }
            if( ( objectWorldMatrix[2][11] <= -0.2 * s70  - 0.225) && ( objectWorldMatrix[2][11] >= -0.2 * s90  - 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * 1;
            }
        }
    }

    //down left
    if( objectWorldMatrix[2][11] >= 0.224 && objectWorldMatrix[2][3] <= -0.645)
    {
        if( (((objectWorldMatrix[2][11] - 0.225) * (objectWorldMatrix[2][11] - 0.225)) + ((objectWorldMatrix[2][3] - (-0.645)) * (objectWorldMatrix[2][3] - (-0.645))) ) >= (0.195 * 0.195) )
        {
            if( objectWorldMatrix[2][11] >= 0.225 && ( objectWorldMatrix[2][11] < -0.2 * -s20 + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * 0;
            }
            if( ( objectWorldMatrix[2][11] >= -0.2 * -s20 + 0.225) && ( objectWorldMatrix[2][11] < -0.2 * -s40  + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * -0.5;
            }
            if( ( objectWorldMatrix[2][11] >= -0.2 * -s40  + 0.225) && ( objectWorldMatrix[2][11] < -0.2 * -s50  + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 1;
                hz3 = speedDisk * -1;
            }
            if( ( objectWorldMatrix[2][11] >= -0.2 * -s50  + 0.225) && ( objectWorldMatrix[2][11] < -0.2 * -s70  + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 0.5;
                hz3 = speedDisk * -1;
            }
            if( ( objectWorldMatrix[2][11] >= -0.2 * -s70  + 0.225) && ( objectWorldMatrix[2][11] <= -0.2 * -s90  + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * -1;
            }
        }
    }

    //down right
    if( objectWorldMatrix[2][11] >= 0.224 && objectWorldMatrix[2][3] >= 0.645)
    {
        if( (((objectWorldMatrix[2][11] - 0.225) * (objectWorldMatrix[2][11] - 0.225)) + ((objectWorldMatrix[2][3] - 0.645) * (objectWorldMatrix[2][3] - 0.645)) ) >= (0.195 * 0.195) )
        {
            if( objectWorldMatrix[2][11] >= 0.225 && ( objectWorldMatrix[2][11] < -0.2 * -s20 + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * 0;
            }
            if( ( objectWorldMatrix[2][11] >= -0.2 * -s20 + 0.225) && ( objectWorldMatrix[2][11] < -0.2 * -s40  + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * -1;
                hz3 = speedDisk * -0.5;
            }
            if( ( objectWorldMatrix[2][11] >= -0.2 * -s40  + 0.225) && ( objectWorldMatrix[2][11] < -0.2 * -s50  + 0.225)  )
            {
                resetValues3();
                hx3 -= speedDisk;
                hz3 -= speedDisk;
            }
            if( ( objectWorldMatrix[2][11] >= -0.2 * -s50  + 0.225) && ( objectWorldMatrix[2][11] < -0.2 * -s70  + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * -0.5;
                hz3 = speedDisk * -1;
            }
            if( ( objectWorldMatrix[2][11] >= -0.2 * -s70  + 0.225) && ( objectWorldMatrix[2][11] <= -0.2 * -s90  + 0.225)  )
            {
                resetValues3();
                hx3 = speedDisk * 0;
                hz3 = speedDisk * -1;
            }
        }
    }

    // disk - table left&right
    if( objectWorldMatrix[2][11] <= -0.42  && objectWorldMatrix[2][3] > - 0.645 && objectWorldMatrix[2][3] < 0.645){
        hz3 *= -1;
        hx3 *= 1;
    }
    if(objectWorldMatrix[2][11] >= 0.42 && objectWorldMatrix[2][3] > -0.645 && objectWorldMatrix[2][3] < 0.645){
        hz3 *= -1;
        hx3 *= 1;
    }

    // goal
    if(objectWorldMatrix[2][3] >= 0.9 && objectWorldMatrix[2][11] > -0.224 && objectWorldMatrix[2][11] < 0.224 ){
        player1+=1;
        goal();
    }
    if(objectWorldMatrix[2][3] <= -0.9 && objectWorldMatrix[2][11] > -0.224 && objectWorldMatrix[2][11] < 0.224 ){
        player2+=1;
        goal();
    }

    objectWorldMatrix[2] = utils.multiplyMatrices(objectWorldMatrix[2], utils.MakeTranslateMatrix(hx3, hy3, hz3));
}


function movement() {

    padsMove();
    padDiskImpact();
    diskTableImpact();

}



function drawScene() {

    utils.resizeCanvasToDisplaySize(gl.canvas);

    if (isAnimation) { animate(); }

    movement();

    computeMatrices();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(shaderProgram[currentShader]);

    for (i = 0; i < sceneObjects; i++) {
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

function subtractVectors(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v) {
    var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
        return [v[0] / length, v[1] / length, v[2] / length];
    } else {
        return [0, 0, 0];
    }
}

function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]];
}

var m4 = {
    lookAt: function(cameraPosition, target, up) {
        var zAxis = normalize(
            subtractVectors(cameraPosition, target));
        var xAxis = normalize(cross(up, zAxis));
        var yAxis = normalize(cross(zAxis, xAxis));
        return [
            xAxis[0], xAxis[1], xAxis[2], 0,
            yAxis[0], yAxis[1], yAxis[2], 0,
            zAxis[0], zAxis[1], zAxis[2], 0,
            cameraPosition[0],
            cameraPosition[1],
            cameraPosition[2],
            1,
        ];
    },
}