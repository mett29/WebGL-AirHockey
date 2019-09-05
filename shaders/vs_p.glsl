/*
	Phong shading is implemented by computing the vertex position and normal directions in the vertex shader, 
	and passing the resulting vectors to the fragment shader. 
	The rendering equation is then solved per pixel in the fragment shader.
*/

attribute vec3 inPosition; 
attribute vec3 inNormal; 
attribute vec2 inUVs;

varying vec3 fsNormal; 
varying vec3 fsPosition; 
varying vec2 fsUVs;
varying vec2 fsUV2s;

uniform mat4 wvpMatrix; 


void main() { 
	fsNormal = inNormal; 
	fsPosition =  inPosition;
	fsUVs = inUVs;
	gl_Position = wvpMatrix * vec4(inPosition, 1.0);
}
	