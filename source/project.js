/** 
	@namespace project.js
	CPSC-1045-001
	@since 25/10/19 
	@version 1.0
	@author Brennan Wilkes 
	@author 100322326
*/

/*
	JSDOCS generation command
	jsdoc source/project.js -d documentation/
*/

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------- GLOBAL VARIABLE DEFINITIONS ---------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
	Canvas object
	@type {object}
	@global
	@constant
*/
const canvas = document.getElementById("world");

/**
	2d context of the canvas
	@type {object}
	@global 
	@constant
*/
const ctx = canvas.getContext("2d");

/** 
	ID of mainloop interval 	
	@type {number}
	@global
*/
let interval_id;

/**
	Reference to the current {@link Stage}. For multiple "levels" within a single load of the program, this variable will change to a new {@link Stage} object. This was supposed to be implimented kinda how I would in C using {@link Stage} Object pointers. i.e. Stage* current_stage -> draw();
	@global
	@type {object}
	@summary Reference to the currently loaded {@link Stage}
*/
let current_stage;

//Screen size constants

/** 
	Maximum x coordinate of the canvas 
	@type {number}
	@global 
	@constant
*/
const MAX_X = canvas.width;

/** 
	Maximum y coordinate of the canvas 
	@type {number}
	@global 
	@constant
*/
const MAX_Y = canvas.height;

/** 
	Minimum x coordinate of the canvas 
	@type {number}
	@global 
	@constant
*/
const MIN_X = 0;

/** 
	Minimum y coordinate of the canvas 
	@type {number}
	@global 
	@constant
*/
const MIN_Y = 0;

/** 
	Time tracking variable for framerate display and optimization
	@type {number}
	@global 
	@todo fully impliment
*/
let last_tick_time = new Date().getTime();

/** 
	Time tracking variable for framerate display and optimization
	@type {number}
	@global 
	@todo fully impliment
*/
let total_tick_time = 0;


/** 
	Linear physics calculation depth is the amount of iterations used to predict the future position of the player. Greater numbers will mean the player position will be predicted and displayed further into the "future", but will add increased strain to the cpu
	@summary Depth of physics calculations
	@type {number}
	@global 
*/
let rails_depth = 5000;

/**
	Map of the current state of keys. i.e. whether they are pressed or not. This is to solve the problem of annoying key press latency.
	@type {number}
	@global
*/
let keyPressMap;

/**
	Paused game flag. 1:paused -1:unpaused
	@type {number}
	@global
*/
let pause = -1;

/**
	Auto otimization flag. 1:ON -1:OFF
	@type {number}
	@global
*/
let auto_optimize = -1;

/**
	Total ticks that have been called. Will cause undefined behaviour if the game is left running for longer than about 200 days. (i.e MAX_SAFE_INT is reached and {@link tickCount} overflows.)
	@type {number}
	@global
*/
let tickCount = 0;

/**
	Map to keep track of dynamic keybinds. Links actual keys with "codes" to determine said key's behaviour. i.e. ArrowLeft will by default map to rotate_left which will cause left rotation behaviour.
	@summary Map to key track of dynamic keybinds
	@global
	@type {Array}
*/
let controls;

/**
	Variable to detect key bind changes. Will change to non null and store the information needed for the next key bind change.
	@global
	@type {object}
*/
let updateNextControl;

/**
	ID of current screen. 0:gameplay 1:Win 2:Lose 3:Start 4:Load 5:Highscores
	@global
	@type {number}
*/
let current_screen = 3;

/**
	Mode of camera - 1:2d -1:3d
	@global
	@type {number}
*/
let camera_mode = 1;

/**
	Array for storing highschool entry initials
	@global
	@type {array}
*/
let high_score_initials = new Array(3);

/**
	Index of selected option in menu
	@global
	@type {number}
*/
let menu_selection = 0;

/**
	Index of selected stage or -1 if random
	@global
	@type {number}
*/
let current_stage_ID;

/**
	Menu options
	@global
	@type {array}
*/
const START_MENU_OPTIONS = ["RANDOM STAGE","LOAD STAGE","VIEW HIGHSCORES"];

/**
	Map of keypress behaviour functions
	@type {array}
	@global 
	@constant
*/
const MENU_KEYPRESS_MAP = [	key_press_game,key_press_win,
							key_press_lose,
							key_press_start_menu,
							key_press_load_menu,
							key_press_highscore_menu,
							function(){}					//Error prevention for users who decide to mash the keyboard on the loading screen
						  ];

/**
	Map of tick behaviour functions
	@type {array}
	@global 
	@constant
*/
const TICK_MAP = [			tick_gameplay,
							tick_win_menu,
							tick_lose_menu,
							function(){menu(START_MENU_OPTIONS,"WELCOME TO PROJECT.JS");},
							function(){menu(STAGES_DISPLAY_OPTIONS,"LOAD STAGE");},
							function(){menu(STAGES_DISPLAY_OPTIONS,"HIGH SCORES");},
							loading_screen_display
			 	 ];

/**
	Stages selection menu options
	@global
	@type {array}
*/
const STAGES_DISPLAY_OPTIONS = new Array(SAVED_STAGES.length+1);

/**
	Colour of start menu text
	@global
	@type {string}
*/
const MENU_COLOUR = ran_colour();

/**
	Gravitational constant
	@constant
	@global
	@type {Number}
*/
const G = 6.674;

/**
 {@link player} acceleration constant
 @constant
 @global
 @type {Number}
*/
const ROCKET_SPEED = 0.001;

/**
	{@link player} camera shake constant
	@constant
	@global
	@type {Number}
*/
const CAMERA_SHAKE = 5;

/**
	Sound manager object. soundManger["soundname"] will return an HTML Audio object
	@type {array}
	@constant
	@global
*/
const soundManager = new Array();

// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------- CLASS HIERARCHY ---------------------------------------------------------------------------------------------
// -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


	


/** 
	class to repersent a game stage/level
	@class
*/
class Stage{
	
	/**
	 Creates an instance of Stage.
	 @constructor
	 @param {number} md Type of constructor to use 0:Random generated {@link Stage}
	 @param {number} stage_id ID of stage to load
	*/
	constructor(md, stage_id){
		
		//randomly generate a new stage
		if(md===0){
			this.generate()
			current_stage_ID = -1;		//indicates a random stage
		}
		
		//load a stage
		else if(md === 1){
			this.load(stage_id);
			current_stage_ID = stage_id;
		}
		
		/** 
			Amount of points available 
			@type {number}
		*/
		this.score = 1000;
		
		/** 
			Completed flag 
			@type {boolean}
		*/
		this.complete = false;
		
		/**
			Array of {@link StarObject} to render in 3d mode
			@type {array}
		*/
		this.skybox = this.generate_skybox(200,true);
		
		/**
			Array of {@link StarObject} to render in 2d mode
			@type {array}
		*/
		this.skymat = this.generate_skybox(50,false);
	}
	
	/**
		Generates a new skybox
		@param num {number} Number of stars to create
		@param project {boolean} If stars should be projected to the boundries
		@returns {array} skybox array
	*/
	generate_skybox(num,project){
		let sky = new Array(num);
		for(let j=0;j<sky.length;j++){
			sky[j] = new StarObject();
			
			//projection is for 3d mode stars
			if(project){
				sky[j].project();
			}
		}
		return sky;
	}
	
	/**
		Loads a stage from file
		@param stage_id ID of stage to load
	*/
	load(stage_id){
	
		//load initial player position and velocity
		this.player_x = SAVED_STAGES[stage_id][0][1];
		this.player_y = SAVED_STAGES[stage_id][0][2];
		this.player_xs = SAVED_STAGES[stage_id][0][3];
		this.player_ys = SAVED_STAGES[stage_id][0][4];
		
		//create planet objects
		this.planets = new Array(SAVED_STAGES[stage_id].length-1);
		for(let i=1;i<SAVED_STAGES[stage_id].length;i++){
			this.planets[i-1] = new Planet(this.planets,SAVED_STAGES[stage_id][i][0],SAVED_STAGES[stage_id][i][1],SAVED_STAGES[stage_id][i][2],SAVED_STAGES[stage_id][i][3]);	
		}	
		
		//assign target planet
		this.planets[0].target = true;
	}
	
	/** Resets stage to defaults*/
	reload(){
		pause = 1;
		reset_keypress();
		
		this.score = 1000;
		this.complete = false;
		this.planets["player"].landed = false;
		this.planets["player"].x = this.player_x;
		this.planets["player"].y = this.player_y;
		this.planets["player"].x_speed = this.player_xs;
		this.planets["player"].y_speed = this.player_ys;
		
		//Redraw physics predictions
		this.planets["player"].calc_rails(rails_depth);
	}
	
	/** 
		Generates a new, random, valid and stable stage
	 	@todo add procedurals
	*/
	generate(){
		
		//Number of planets to be created
		let rand = ran_b(2,10);
		
		/** 
			Main array of {@link GameObject} storage. Size is number of {@link Planet} plus an addition slot for the {@link player}	
			@type {Array}
			@todo Add additional slots for procedurals
		*/
		this.planets = new Array(0);//rand+1);
		
		//Populate this.playets with planet objects
		let temp;	
		for(let i=0;i<rand;i++){
			
			//create randomized planet object
			temp = new Planet(this.planets,ran_b(MIN_X+50,MAX_X-50), ran_b(MIN_Y+50,MAX_Y-50), ran_colour(), ran_b(10,20));			
			
			//validate planet placement
			if(calc_collision(temp,this.planets)){
				i--;
			}
			else{
				this.planets.push(temp);
			}
		}
		
		//Set one of the planets as the stage target
		this.planets[0].target = true;
		
		//Positional shift values and their respective velocity vectors
		const pos = [[0,-1],[-1,0],[0,1],[1,0]];
		const spd = [[-1,0],[0,-1],[1,0],[0,1]];
		
		//valid starting orientation flags
		let valid;
		let found = false;
		
		//Temporary storage for physics calculations
		let grav;

		//Dummy object to elegently store coordinate and speed values
		let temp_dummy = new DummyObject(0,0);
		
		/*
			Main validation loop. Will loop over every planet, and place the initial
			player location at each relative coordinate in respect to said planet,
			and set the relative velocity accordingly. Then it will calculate ahead
			[rails_depth] into the future, and if the player has not collided with 
			any objects, and has remained roughly within the screen bounds, the object
			distribution and initial player position will be marked as valid, and will be
			used. Complexity is O(4*p*d), ex. depth = 10000, planets = 10, validation
			will take up to O(400000). This means generating a valid stage may take a 
			few seconds, depending on hardware.
		*/
		for(let i=1; i < rand && (!found) ;i++){
			for(let j=0;j<4;j++){
				valid = true;
				
				//Set initial position
				temp_dummy.x = this.planets[i].x+(pos[j][0]*this.planets[i].mass*3);
				temp_dummy.y = this.planets[i].y+(pos[j][1]*this.planets[i].mass*3);
				
				//Set initial speed
				temp_dummy.xs = spd[j][0]*this.planets[i].mass/5;
				temp_dummy.ys = spd[j][1]*this.planets[i].mass/5;
				
				//Calculate physics translations
				for(let k=0;k<rails_depth/2;k++){
				
					//calculate current tick of gravity
					grav = calc_grav(temp_dummy,this.planets);
					
					//Apply translations
					temp_dummy.xs += grav[0];
					temp_dummy.ys += grav[1];
					temp_dummy.x += temp_dummy.xs;
					temp_dummy.y += temp_dummy.ys;
					
					//Validate current tick
					if(calc_collision(temp_dummy,this.planets,10) || !inBounds(temp_dummy.x,temp_dummy.y,MAX_X*-0.1,MAX_X*1.1,MAX_Y*-0.1,MAX_Y*1.1)){
						valid = false;
						break;
					}	
				}
				
				//Valid stage found
				if(valid && inBounds(temp_dummy.x,temp_dummy.y,MIN_X,MAX_X,MIN_Y,MAX_Y)){
					found = true;
					
					//Set inital player location
					this.player_x = this.planets[i].x+(pos[j][0]*this.planets[i].mass*3);
					this.player_y = this.planets[i].y+(pos[j][1]*this.planets[i].mass*3);
					
					//Set itinial player velcocity vector
					this.player_xs = spd[j][0]*this.planets[i].mass/5;
					this.player_ys = spd[j][1]*this.planets[i].mass/5;
					
					break;
				}
			}
		}
		
		//Valid stage was not found, generate a new one
		if(!found){
			this.generate();
		}
	}
}

/**
  @class
  Top level object class. Just contains an x and y value. This is used for passing x y values into functions without the ability to overload.
*/
class DummyObject{
	/**
		@constructor 
		@param {number} x x coordinate
		@param {number} y y coordinate		
	*/
	constructor(x,y){
		/** 
			x coordinate 
			@type {Number}
		*/
		this.x = x;
		
		/** 
			y coordinate 
			@type {Number}
		*/
		this.y = y;
	}
}

/**
	@class Skybox star class. Is a {@link DummyObject} with a z coordinate and an intensity or "brightness" scaler
	@extends DummyObject
*/
class StarObject extends DummyObject{
	/**
		@constructor 
	*/
	constructor(){
		super(ran_b(0,MAX_X),ran_b(0,MAX_X));
		
		/**
			Y coordinate to be drawn on screen. Z coordinate in 3d space
			@type {number}
		*/	
		this.z = ran_b(0,MAX_Y);
		
		/**
			Intensity to be drawn at.
			@type {number}
		*/
		this.intensity = Math.random();
	}
	
	/**
		Projects closest x or y coordinate to the boundry. This is used to create the effect of a "box" of stars, where all {@link StarObject} have one coordinate on the min or max plane. In this implementation, the x/y coordinate closest to the plane is set to the plane itself. However as the stars are actually rendered as a cylinder, this does create a bug where stars are more likely to be clustered around the "corners" of the skybox, however I don't deem this an issue worth working on, as clusters of stars actually create a better looking texture than a perfectly random distribution.
		@summary Projects closest x or y coordinate to the boundry
	*/
	project(){
		if(Math.min(this.x,MAX_X-this.x) < Math.min(this.y,MAX_X-this.y)){
			if(this.x < MAX_X/2){
				this.x = MIN_X;
			}
			else{
				this.x = MAX_X;
			}
		}
		else{
			if(this.y < MAX_X/2){
				this.y = MIN_X;
			}
			else{
				this.y = MAX_X;
			}
		}
		
		//shifts the z coordinate to be closer to the middle of the screen. This is an optimization because in 3d camera mode, the top and bottom of the screen are covered by the IVA texture.
		this.z = ran_b(Math.floor(MAX_Y*0.2),Math.floor(MAX_Y*0.8));
	}
	
	/**
		Draws the star at x
		@param x {number} x coordinate for rendering
	*/
	draw(x){
		draw_shape("arc",x,this.z,"rgba(255,255,255, "+this.intensity+")",2,0,0,0,Math.PI*2);
	}
}

/**
	@class Parent class of all interactable objects such as {@link Planet} and {@link Rocket}.
	@extends DummyObject
*/
class GameObject extends DummyObject{
	/**
	 	@constructor
		@param {object} storage Array of {@link GameObject} to store itself in
		@param {number} x x coordinate
		@param {number} y y coordinate
		@param {string} type Descriptor of object. i.e. "planet" or "rocket"
	*/
	 constructor(storage,x,y,type){
		super(x,y);
		
		/**
			Descriptor of object i.e. "planet" or "rocket"
			@type {string}
		*/
		this.type = type;
	}
}

/**
	@class Class for controlable {@link GameObject}
	@extends GameObject
*/
class Rocket extends GameObject{
	/**
	 	@constructor
		@param {array} storage Array of {@link GameObject} to store itself in
		@param {number} x x coordinate
		@param {number} y y coordinate
		@param {number} xs x component of velocity vector
		@param {number} yx y component of velocity vector
	*/
	constructor(storage,x,y,xs,ys){
		super(storage,x,y,"rocket");
		
		/**
			Direction to point in; Used both for physics and rendering
			@type {number}
		*/
		this.dir = 0;
		
		/** 
			x component of velocity vector
			@type {number}
		*/
		this.x_speed = xs;
		
		/**
			y component of velocity vector
			@type {number}
		*/
		this.y_speed = ys;
		
		/**
			Array of all coordinate points of physics predictions FORMAT: [x,y,x_speed,y_speed]
			@type {array}
		*/
		this.rails = new Array(rails_depth);
		
		/** 
			Workaround for passing coordinates into non overloaded functions.
			This is used for calculating physics and should eventually
			become deprecated. Fingers crossed
		*/
		this.dummy = new DummyObject(0,0);
		
		/**
			Landed flag
			@type {boolean}
		*/
		this.landed = false;

		/**
			Path of the rocket texture image file. This file has been sitting around my computer for YEARS, no idea where I got it from.
			@type {string}
		*/
		this.texture_path = "../assets/ship.png";

		/**
			Canvas image object to be drawn
			@type {object}
		*/
		this.texture = new Image();
		this.texture.src = this.texture_path;

		/**
			Path of the rocket IVA image file. Taken from www.dreamstime.com/
			@type {string}
		*/
		this.iva_path = "../assets/ship_iva.png";

		/**
			Canvas image object to be drawn
			@type {object}
		*/
		this.iva = new Image();
		this.iva.src = this.iva_path;

		/**
			Size of the rocket hitbox, and scale factor of texture
			@type {number}
		*/
		this.size = 25;

		/**
			Storage for rocket exhaust trail
			@type {array}
		*/
		this.trails = new Array(this.size);

		/**
			Colour gradient used for rocket trails
			@type {object}
		*/
		this.trails_gradient = ctx.createLinearGradient(0,0,0,this.size,this.size,this.size);
		this.trails_gradient.addColorStop(0, "orange");
		this.trails_gradient.addColorStop(0.5, "red");
	}
	
	/**	Draws the full rocket sprite to the canvas	*/
	draw(){
	
		//calculate and render fiery trails by drawing orange/red circles with descending radii.
		for(let i=0;i<this.trails.length-1&&this.trails[i]!=undefined;i++){
			//render circle
			draw_shape("arc",this.x+(Math.sin(Math.PI-this.dir)*i*3),this.y+(Math.cos(Math.PI-this.dir)*i*3),this.trails_gradient,(this.trails.length-i)/3,this.dir,0,0,Math.PI*2);
			
			//update trails array
			if(this.trails[i]===0){
				this.trails[i] = undefined;
			}
			else{
				this.trails[i+1] = this.trails[i]-1;
			}
		}
		
		//update trails array
		if(this.trails[0]!=undefined){
			this.trails[0]--;
		}
		
		//draw rocket texture
		draw_shape("texture",this.x,this.y,this.texture,this.size,this.dir,1);
	}
	
	/**
		Accelerates the {@link Rocket} by the {@link ROCKET_SPEED} in the current {@link Rocket#dir} and decrements {@link Stage#score}
	*/
	thrust(){
	
		//if in 3rd person camera mode, start a new rocket trail
		if(camera_mode === 1){
			this.trails[0] = this.trails.length;
		}
		
		//decrement score
		current_stage.score--;
		
		//apply acceleration
		this.accelerate(vector(ROCKET_SPEED,this.dir));
	}
	
	/**
		Accelerates the {@link Rocket} by the passed velocity vector
		@param velocity {array} velocity vector to be applied
	*/
	accelerate(velocity){
		this.x_speed = this.x_speed + velocity[0];
		this.y_speed = this.y_speed + velocity[1];
	}
	
	/**
		Rotates the {@link Rocket} in the passed direction
		@param direction {number} rotational direction
	*/
	rotate(direction){
		this.dir+=Math.PI/120*direction;
	}
	
	/**
		Applies physics and updates positional attributes
	*/
	tick(){
		if(!this.landed){
			this.accelerate(calc_grav(this,current_stage.planets));
			this.calc_rails(0);
			
			this.x = this.x + this.x_speed;
			this.y = this.y + this.y_speed;
		}
	}
	/**
		Calculates and generates the {@link Rocket#rails} attribute
		@param iter {number} Was formerly a recursive function. Now specifies mode
		@todo good lord clean this function up. It. Is. A. Mess.
	*/
	calc_rails(iter){
		let prev;
		let index;
		let grav;
		
		//singular new rail calc i.e. new tick
		if(iter==0){
			left_shift(this.rails);
			prev = this.rails[this.rails.length-1];
			index = this.rails.length-1;
			
			//This method of passing data has to be changed
			this.dummy.x=prev[0];
			this.dummy.y=prev[1];
			
			//calculate physics
			grav = calc_grav(this.dummy,current_stage.planets)
			
			//apply physics
			this.rails[index] = [prev[0]+prev[2]+grav[0],prev[1]+prev[3]+grav[1],prev[2]+grav[0],prev[3]+grav[1]]; // [x,y,x_speed,y_speed]
		}
		else{
		
			//This was formerly recursive but I was hitting the stack limit :(
			while(true){
				index = rails_depth-iter;
				
				//Either physics depth has been reached or a collision has happened, so the array is padded with null terminators (false values right now)
				if(iter<0){
					index = index + (iter*2);
					
					//this should be changed with a null terminator @todo
					this.rails[index] = false;
					iter++;
					if(iter<0){
						continue;
					}
					break;
				}
				else if(iter===rails_depth){	//first of recursive
					prev = [this.x,this.y,this.x_speed,this.y_speed];
				}
				else{							//normal recursive
					prev = this.rails[rails_depth-iter-1];
				}
				this.dummy.x=prev[0];
				this.dummy.y=prev[1];
				
				//calculate physics
				grav = calc_grav(this.dummy,current_stage.planets)
				
				//apply physics
				this.rails[index] = [prev[0]+prev[2]+grav[0],prev[1]+prev[3]+grav[1],prev[2]+grav[0],prev[3]+grav[1]]; // [x,y,x_speed,y_speed]
		
				iter--;
				if(iter===0){
					break;
				}
				
				//switch to collision mode ie pad out array with null terminators
				if(calc_collision(this.dummy,current_stage.planets)){
					iter = iter * -1;
				}	
			}
		}
	}
}

/**
	@class Class of all planet objects
	@extends GameObject
	@todo move to separate radius/mass attribute system
*/
class Planet extends GameObject{
	
	/**
	 	@constructor
		@param {array} storage Array of {@link GameObject} to store itself in
		@param {number} x x coordinate
		@param {number} y y coordinate
		@param {string} colour Colour of planet
		@param {number} mass Mass of planet
	*/
	constructor(storage,x,y,colour,mass){
		super(storage,x,y,"planet");
		
		/**
			Mass AND radius of planet
			@type {number}
			@todo move to separate radius/mass attribute system
		*/
		this.mass = mass;
		
		/**
			Colour of planet
			@type {string}
		*/
		this.colour = colour;
		
		/**
			Transparent edge gradient of the colour
			@type {string}
		*/
		this.colour_gradient;
		
		/**
			Stage target landing flag
			@type {boolean}
		*/
		this.target = false;
	}
	
	/**
		Draws the planet to the canvas in map overview mode
	*/
	draw(){
		//render circle
		draw_shape("arc",this.x,this.y,this.colour,this.mass,0,0,0,Math.PI*2);
		
		//render golden outline
		if(this.target){
			draw_shape("arc",this.x,this.y,"yellow",this.mass*1.2,0,1,0,Math.PI*2);
		}
	}
	
	/**
		Draws the planet to the canvas in first person raytracing mode
	*/
	draw3d(x){
		//this formula is incorrect, but it works well enough for this project.
		let size = 500*this.mass/(get_distance(this,current_stage.planets["player"]));
		
		//create a gradient so that planets have smooth edges
		this.colour_gradient = ctx.createRadialGradient(0,0,0,0,0,size);
		this.colour_gradient.addColorStop(0, this.colour);
		this.colour_gradient.addColorStop(0.95, this.colour);
		this.colour_gradient.addColorStop(1, add_alpha(this.colour,0));
		
		//render planet
		draw_shape("arc",x,MAX_Y/2,this.colour_gradient,size,0,0,0,Math.PI*2);
		
		//render golden outline
		if(this.target){
			draw_shape("arc",x,MAX_Y/2,"yellow",size*1.1,0,1,0,Math.PI*2);
		}
	}
}

// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------- FUNCTIONS ---------------------------------------------------------------------------------------------
// --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 	Draws a shape to the canvas
	@param {string} shape Shape description
	@param {number} x x coordinate to draw at
	@param {number} y y coordinate to draw at
	@param {string} colour Shape colour
	@param {number} size size to scale shape to in radians
	@param {number} rotation rotation to draw shape at
	@param {number} md Outline flag 1:YES 0:NO
	@param {number} arc_start if a circle, radian to start drawing at
	@param {number} arc_length if a circle, radian to end drawing at
*/
function draw_shape(shape,x,y,colour,size,rotation,md,arc_start,arc_length){
	ctx.save();
	ctx.translate(x,y);
	ctx.rotate(rotation);
	ctx.beginPath();
	ctx.fillStyle = colour;
	ctx.strokeStyle = colour;
	
	if(shape=="tri"){
		draw_triangle(size);
	}
	else if(shape=="arc"){
		draw_arc(size,arc_start,arc_length)
	}
	else if(shape=="texture"){
		ctx.drawImage(colour,size/-2,size/-2,size,size);
	}
	if(md===0){
		ctx.fill();
	}
	else{
		ctx.stroke();
	}
	ctx.restore();
}

/**
 	Draws an arc to the canvas
	@param {number} size size to scale shape to in radians
	@param {number} arc_start Radian to start drawing at
	@param {number} arc_length Radian to end drawing at
*/
function draw_arc(size,arc_start,arc_length){
	ctx.arc(0,0, size, arc_start, arc_length);
}

/** 
	gets all of the projects sound names 
	Sounds were aquired from soundbible.com and soundcloud.com/squirrel-murphy/maeistrom-sounds
	@returns array of sound names
*/
function get_sounds(){
	return ["tick","thrust","win","crash","lose"];
}

/**
	Runs on page load. Initializes global variables. Sets intial physics calculation depth to the settings field. Initializes default keybinds. Adds event listeners.
	@todo Move to settings file system
	@todo Move to server side global highscores
*/
function setUp(){
	
	//initialize sounds
	let sounds=get_sounds();
	for(let i=0;i<sounds.length;i++){
		soundManager[sounds[i]] = new Audio("../assets/"+sounds[i]+".mp3");
	}
	soundManager["thrust"].loop = true;
	
	//pull highscore data from the browser cache
	if(typeof(Storage) !== "undefined" || typeof(Storage) !== undefined){
		
		//first time project load
		if(localStorage.getItem("init") === null) {
			localStorage.setItem("init","true");
			for(let i=0;i<HIGH_SCORES.length;i++){
				localStorage.setItem(i,String(HIGH_SCORES[i]));
			}
		}
		
		//get cached highscores
		else{
			let temp;
			for(let i=0;i<HIGH_SCORES.length;i++){
				HIGH_SCORES[i] = new Array(0);
				temp = localStorage.getItem(i).split(",");
				for(let j=0;j<temp.length;j+=2){
					HIGH_SCORES[i].push([temp[j],parseInt(temp[j+1])]);
				}
			}
		}
	}
	
	//sort highscores
	for(let i=0;i<HIGH_SCORES.length;i++){
		HIGH_SCORES[i].sort(high_score_sort);
	}
	
	//initialize initials
	for(let i=0;i<high_score_initials.length;i++){
		high_score_initials[i] = '_';
	}
	
	//generate stage display array
	for(let i=0;i<SAVED_STAGES.length;i++){
		STAGES_DISPLAY_OPTIONS[i] = "["+i+"] "+SAVED_STAGES[i][0][0];
	}
	STAGES_DISPLAY_OPTIONS[SAVED_STAGES.length] = "BACK";;
	
	//Set default value to settings text field
	set_val("rails_depth",rails_depth);
	
	//Initialize keybinds
	keyPressMap = new Array(0);
	updateKey(false);
	controls=new Array(0);
	controls["Thrust"] = "Space";
	controls["Rotate_Left"] = "ArrowLeft";
	controls["Rotate_Right"] = "ArrowRight";
	controls["Freeze_Time"] = "KeyF";
	controls["Reload"] = "KeyR";
	controls["Camera"] = "KeyC";
	controls["Menu"] = "Escape";
	updateNextControl = null;
	
	
	//Setup event listeners
	addEventListener("keydown",key_down);
	addEventListener("keyup",key_up);
	addEventListener("click",mouse_click);
	
	//set font
	ctx.font = "52px VT323";
	
	//I am using setTimeout() instead of setInterval() so that I can dynamically change the tickrate at runtime
	interval_id = setTimeout(tick,10);	
}

/**
	Calculates the current framerate
	@returns {number} Framerate
*/
function get_framerate(){
	return Math.floor((tickCount%100)/total_tick_time*1000);
}

/**
	Resets the {@link Rocket#rails} array
	@param amt new depth value
*/
function update_rails(amt){
	rails_depth = amt;
	current_stage.planets["player"].rails = new Array(rails_depth);
	current_stage.planets["player"].calc_rails(rails_depth);
	set_val("rails_depth",rails_depth);
}

/**
	Toggles optimizations
	@todo fully implement better optimizations. For now, this isn't really worth turning on
*/
function toggle_auto_rails(){
	auto_optimize = auto_optimize * -1;
	if(auto_optimize===1){
		set_HTML("auto_rails","Slow computer optimizations are: ON");
	}
	else{
		set_HTML("auto_rails","Slow computer optimizations are: OFF");
	}
}

/**	Runs tick behaviour for the gameplay screen */
function tick_gameplay(){
	
	//Key down detection
	if(keyPressMap["Thrust"]){
		current_stage.planets["player"].thrust();
		//recalculate rails
		if(camera_mode===1){
			current_stage.planets["player"].calc_rails(rails_depth);
		}
	}
	if(keyPressMap["Rotate_Left"]){
		current_stage.planets["player"].rotate(-1);
	}
	if(keyPressMap["Rotate_Right"]){
		current_stage.planets["player"].rotate(1);
	}

	if(pause===-1){
		if(!current_stage.planets["player"].landed){
			tickCount++;
			if(tickCount%100===0){
				current_stage.score--;
			}
		}

		//calculates player collisions
		current_stage.planets["player"].landed = (calc_collision(current_stage.planets["player"],current_stage.planets) || current_stage.planets["player"].landed);

		//invokes player subtick
		current_stage.planets["player"].tick();
		
		

		//win/loss detection and behaviour
		if(current_stage.planets["player"].landed&&(!current_stage.complete)){
			current_stage.complete = true;
			let win=false;
			for(let i=0;i<current_stage.planets.length;i++){
				
				//check that the player is landed at the target planet
				if(current_stage.planets[i].target){
					if(get_distance(current_stage.planets[i],current_stage.planets["player"])<=current_stage.planets[i].mass+current_stage.planets["player"].size){
						win=true;
					}
					break;
				}
			}
			reset_keypress();
			
			//keep score at a minimum of 0
			current_stage.score = Math.max(0,current_stage.score);

			if(win){
				soundManager["win"].play();
				current_screen = 1;
			}
			else{
				soundManager["crash"].play();
				setTimeout(function(){soundManager["lose"].play();},1000);
				current_screen = 2;
			}
		}
	}

	//Render the screen
	draw();

	//Update score text
	set_HTML("score",Math.max(current_stage.score,0));
}

/**	Runs tick behaviour for the win menu */
function tick_win_menu(){
	
	//draw a faded version of the final gameplay screen
	draw();
	clear_screen(0.8);
	
	//draw the highscore initial entering screen
	ctx.fillStyle = current_stage.planets[0].colour;
	ctx.textAlign = "center";
	ctx.fillText("SCORE: "+current_stage.score, MAX_X/2, 150);
	let entered = true;
	for(let i=0;i<high_score_initials.length;i++){
		if(high_score_initials[i]==='_'){
			entered = false;
		}
	}
	if(entered){
		ctx.fillText(high_score_initials[0]+high_score_initials[1]+high_score_initials[2]+" WON", MAX_X/2, 75);
		ctx.fillText("PRESS ANY KEY", MAX_X/2, 250);
		ctx.fillText("TO CONTINUE", MAX_X/2, 315);
	}
	else{
		ctx.fillText("YOU WON", MAX_X/2, 75);
		ctx.fillText("ENTER INITIALS: "+high_score_initials[0]+" "+high_score_initials[1]+" "+high_score_initials[2], MAX_X/2, 225);
	}
}

/**	Runs tick behaviour for the lose menu */
function tick_lose_menu(){
	
	//draw a faded version of the final gameplay screen
	draw();
	clear_screen(0.8);
	
	ctx.fillStyle = current_stage.planets[0].colour;
	ctx.textAlign = "center";
	ctx.fillText("YOU LOSE", MAX_X/2, 75);
	ctx.fillText("PRESS ANY KEY", MAX_X/2, 250);
	ctx.fillText("TO TRY AGAIN", MAX_X/2, 315);
}

/**	Draws the word loading to the screen	*/
function loading_screen_display(){
	clear_screen();
	ctx.fillStyle = MENU_COLOUR;
	ctx.textAlign = "center";
	ctx.fillText("LOADING", MAX_X/2, 150);
}

/**
	Main game tick function. Applies key inputs. Updates framerate display. Updates tickcounts. Runs subtick methods. Calculates collisions. Calculates endgame conditions. Draws the screen. Updates information displays
*/
function tick(){
	
	//check for highscore display screen
	if(current_screen >= 50){
		let h_score_arr = new Array(HIGH_SCORES[current_screen-50].length);		
		for(let i=0;i<HIGH_SCORES[current_screen-50].length;i++){
			h_score_arr[i] = HIGH_SCORES[current_screen-50][i][0]+" - "+HIGH_SCORES[current_screen-50][i][1];
		}
		menu_selection = -1;
		menu(h_score_arr,STAGES_DISPLAY_OPTIONS[current_screen-50]+" HIGHSCORES");
	}
	
	//run tick function for every other screen
	else{
		TICK_MAP[current_screen]();
	}
	
	//Framerate calculation and display
	if(tickCount%100===99){
		set_HTML("fps","Framerate: "+get_framerate()+" fps");
	
		//WIP optimization. Adjusts physics calculation depth
		if(auto_optimize === 1){
			if(get_framerate()<50){
				update_rails(Math.max(1,rails_depth-1000));
			}
			else if(get_framerate()>60){
				update_rails(rails_depth+1000);
			}
		}
		total_tick_time = 0;
	}
	
	//WIP Optimizations for running ticks slightly sooner if the program is lagging
	let tick_time = new Date().getTime()-last_tick_time;
	let speed = 10	//this is to be implemented at a later date when I have a better understanding of how js events work under the hood
	total_tick_time += tick_time;
	last_tick_time = new Date().getTime();
	
	//Call next game tick
	interval_id = setTimeout(tick,speed);
}

/**
	Clears the screen by redrawing the background image
	@param {number} alpha Alpha value for background
*/
function clear_screen(alpha){
	if(alpha===undefined){
		alpha = 1;
	}
	ctx.fillStyle = "rgba(0, 0, 0, "+alpha+")";
	ctx.fillRect(MIN_X,MIN_Y,MAX_X,MAX_Y);
}

/** Renders the screen */
function draw(){
	clear_screen();
	
	//2d map overview mode
	if(camera_mode===1){
		
		//render stars
		for(let s=0;s<current_stage.skymat.length;s++){
			current_stage.skymat[s].draw(current_stage.skymat[s].x);
		}
		
		//Draw the physics prediciton line
		if(!current_stage.planets["player"].landed){
			draw_path();
		}
	
		//Draw each object
		for(let obj=0;obj<current_stage.planets.length;obj++){
			current_stage.planets[obj].draw();
		}
		
		//draw the player
		current_stage.planets["player"].draw();
	}
	
	//3d first person camera mode
	else{
		let angle;
		let end_point = new DummyObject(0,0);
		
		//sort planets based on distance to player
		current_stage.planets.sort(sort_player_distance);
		
		//render stars
		if(auto_optimize === -1){
			let zero_point = new DummyObject(250,250);
			//render skybox
			for(let s=0;s<current_stage.skybox.length;s++){
				for(let i=-90;i<90;i++){
					end_point.x = Math.cos(Math.PI*i/180 + current_stage.planets["player"].dir+Math.PI/2)*MAX_X*2;
					end_point.y = Math.sin(Math.PI*i/180 + current_stage.planets["player"].dir+Math.PI/2)*MAX_Y*2;
				
					//checks if ray has collided with star using triangle projection
					if(Math.abs(
								(get_distance(end_point,current_stage.skybox[s])+get_distance(zero_point,current_stage.skybox[s]))
								- get_distance(zero_point,end_point)) 
								< 0.1){
						
						//Draw star
						current_stage.skybox[s].draw(MAX_X/2 + (i/45*MAX_X/2));
						break;
					}
				
				}
			}
		}
		
		//Render planets
		for(let p=0;p<current_stage.planets.length;p++){
			for(let i=-90;i<90;i++){
				end_point.x = current_stage.planets["player"].x + Math.cos(Math.PI*i/180 + current_stage.planets["player"].dir+Math.PI/2)*MAX_X;
				end_point.y = current_stage.planets["player"].y + Math.sin(Math.PI*i/180 + current_stage.planets["player"].dir+Math.PI/2)*MAX_Y;
				
				//checks if ray has collided with star using triangle projection
				if(Math.abs(
							(get_distance(end_point,current_stage.planets[p])+get_distance(current_stage.planets["player"],current_stage.planets[p]))
							- get_distance(current_stage.planets["player"],end_point)) 
							< 0.001*get_distance(current_stage.planets["player"],current_stage.planets[p])){
					
					//Draw planet
					current_stage.planets[p].draw3d(MAX_X/2 + (i/45*MAX_X/2));
					break;
				}
				
			}
		}
		
		//apply camera shake
		let shift_x = 0;
		let shift_y = 0;
		if(keyPressMap["Thrust"]){
			shift_x = ran_b(-1*CAMERA_SHAKE,CAMERA_SHAKE);
			shift_y = ran_b(-1*CAMERA_SHAKE,CAMERA_SHAKE);
		}
		
		//render IVA texture
		draw_shape("texture",MAX_X/2 + shift_x,MAX_Y/2 + shift_y,current_stage.planets["player"].iva,MAX_X+(CAMERA_SHAKE*2),0,1);
	}
	
	//pause screen white filter
	if(pause===1){
		ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
		ctx.fillRect(MIN_X,MIN_Y,MAX_X,MAX_Y);
	}
}

/**
	Gets the adjustable keybinds
	@returns {array} adjustable keybinds
*/
function get_possible_keys(){
	return ["Thrust","Rotate_Left","Rotate_Right","Camera","Menu"];
}

/**
	Updates a keybind
	@param {string} val new keybind
	@param {object} event event to pull keypress data from. If undefined, function is in force override mode
*/
function updateKey(val,event){
	let force = false;
	if(event===undefined){
		force = true;
	}
	for(let i=0;i<3;i++){
		if(force || event.code === controls[get_possible_keys()[i]]){
			keyPressMap[get_possible_keys()[i]] = val;
		}
	}
}

/**
	Detects key down events and updates the key tracker
	@param {object} event event to pull keypress data from
*/
function key_down(event){
	if(updateNextControl===null){
		updateKey(true,event);
	}
	if(current_screen === 0 && event.code === controls["Thrust"]){
		soundManager["thrust"].play();
	}
}

/**
	Runs keypress behaviour for gameplay screen
	@param {object} event keypress event object 
 */
function key_press_game(event){
	updateKey(false,event);
	if(event.keyCode === 13){
		update_settings()
	}
	else if(event.code === controls["Freeze_Time"]){
		if(pause===-1){
			current_stage.score -= 50;
		}
		pause = pause * -1;	
	}
	else if(event.code === controls["Reload"]){
		current_stage.reload();
	}
	else if(event.code === controls["Camera"]){
		camera_mode = camera_mode * -1;
		if(camera_mode === 1){
			current_stage.planets["player"].calc_rails(rails_depth);
		}
	}
}

/**
	Runs keypress behaviour for win screen
	@param {object} event keypress event object 
 */
function key_press_win(event){
	let initial = -1;
	for(let i=0;i<high_score_initials.length;i++){
		if(high_score_initials[i]==='_'){
			initial = i;
			break;
		}
	}
	
	//All three initials have been entered
	if(initial===-1){
		if(current_stage_ID > -1){
			
			//saves highscore
			if(HIGH_SCORES[current_stage_ID].length<6 || current_stage.score > HIGH_SCORES[current_stage_ID].length[HIGH_SCORES[current_stage_ID].length-1]){
				HIGH_SCORES[current_stage_ID].push([high_score_initials[0]+high_score_initials[1]+high_score_initials[2],current_stage.score]);
				HIGH_SCORES[current_stage_ID].sort(high_score_sort);
			
				//save highscore to browser cache
				if(typeof(Storage) !== "undefined" || typeof(Storage) !== undefined){
					localStorage.setItem(current_stage_ID,localStorage.getItem(current_stage_ID)+","+high_score_initials[0]+high_score_initials[1]+high_score_initials[2]+","+current_stage.score);
				}
			
			}
		}
		
		//reset game
		current_screen = 0;
		high_score_initials = ['_','_','_'];
		current_stage.reload();
	}
	
	//save a new initial
	else if(event.keyCode>=65 && event.keyCode<=90){
		if(initial!=-1){
			high_score_initials[initial] = event.key.toUpperCase();
			play_tick_sound();
		}
	}
}

/**
	Runs keypress behaviour for lose screen
	@param {object} event keypress event object 
 */
function key_press_lose(event){
	current_screen = 0;
	current_stage.reload();
}

/**
	Runs keypress behaviour for start menu
	@param {object} event keypress event object 
 */
function key_press_start_menu(event){
	if(event.keyCode === 13 || event.keyCode === 32){
		
		//random generation selected
		if(menu_selection === 0){
			current_screen = 6;
			
			//This delay was to allow for the rendering of the "LOADING" screen to happen before the stage begins generating and blocks screen refreshes
			setTimeout(function(){load_level(0);},250);		
		}
		
		//Load level screen selected
		else if(menu_selection === 1){
			current_screen = 4;
			menu_selection = 0;
		}
		
		//highscore screen selected
		else if(menu_selection === 2){
			current_screen = 5;
			menu_selection = 0;
		}
	}
	menu_selection = update_selection(event.keyCode,menu_selection,START_MENU_OPTIONS);
}

/**
	Runs keypress behaviour for load stage menu
	@param {object} event keypress event object 
 */
function key_press_load_menu(event){
	if(event.keyCode === 13 || event.keyCode === 32){
		
		//back
		if(menu_selection === STAGES_DISPLAY_OPTIONS.length-1){
			menu_selection = 0;
			current_screen = 3;
		}
		
		//loads a level
		else{
			load_level(1,menu_selection);
		}
	}
	menu_selection = update_selection(event.keyCode,menu_selection,STAGES_DISPLAY_OPTIONS);
}

/**
	Runs keypress behaviour for highscore viewing menu
	@param {object} event keypress event object 
 */
function key_press_highscore_menu(event){
	if(event.keyCode === 13 || event.keyCode === 32){
		
		//back
		if(menu_selection === HIGH_SCORES.length){
			menu_selection = 0;
			current_screen = 3;
			return;
		}
		
		//selected a highscore to view
		else{
			current_screen = 50+menu_selection;
			menu_selection = 0;
			return;
		}
	}
	menu_selection = update_selection(event.keyCode,menu_selection,STAGES_DISPLAY_OPTIONS);
}

/**
	Loads a new stage into the game
	@param {number} md stage creation mode 0:Random gen, 1: Load level
	@param {number} index if loading a level, index of level to load 
 */
function load_level(md,index){
	
	//initalize stage
	current_stage = new Stage(md,index);
	
	//load player
	current_stage.planets["player"] = new Rocket(current_stage.planets,current_stage.player_x,current_stage.player_y,current_stage.player_xs,current_stage.player_ys);

	//Initial physics calculation
	current_stage.planets["player"].calc_rails(rails_depth);
	
	reset_keypress();
	pause = 1;
	current_screen = 0;
}

/**
	Detects key up events and updates the key tracker
	@param {object} event event to pull keypress data from
*/
function key_up(event){
	
	//Finish keybind cycle. Apply new key to keybind map and unpause
	if(updateNextControl!=null){
		controls[updateNextControl] = event.code;
		set_HTML(updateNextControl,event.code);
		updateNextControl = null;
		pause = -1;
	}
	
	//Run regular keypress behaviour
	else{
		if(event.code === controls["Menu"]){
			if((current_screen === 3 || current_screen === 4 || current_screen === 5) && current_stage!=undefined && current_stage.planets != undefined){
				current_screen = 0;
			}
			else if(current_screen === 0){
				current_screen = 3;
			}
			menu_selection = 0;
			reset_keypress();
		}
		else if(event.code === controls["Thrust"]){
			soundManager["thrust"].pause();
			soundManager["thrust"].currentTime = 0;
		}
		
		//highscore menu - return to main menu
		if(current_screen >= 50){
			current_screen = 3;
			menu_selection = 0;
			play_tick_sound();
		}
		else{
			if(current_screen!=0 && (event.keyCode === 13 || event.keyCode === 32)){
				play_tick_sound();
			}
			MENU_KEYPRESS_MAP[current_screen](event);
		}
	}
}

/**
	Detects mouse click events and updates the rail depth settings
	@param {object} event event to pull mousepress data from
*/
function mouse_click(event){
	//If mouse click was outside of the physics depth field, update it 
	if(event.target!=get_element("rails_depth")){
		update_settings();
	}
	
}

/**
	Generates x/y values from a vector in magnitude/angle form
	@param {number} magnitude Magnitude value to apply to vector
	@param {number} angle angle to multiply magnitude by
	@returns {array} Vector in [x,y] form
*/
function vector(magnitude,angle){
	return [magnitude*Math.sin(angle*-1),magnitude*Math.cos(angle)];
}

/**
	Calculates x/y accleration to apply to an object
	@param {object} object to calculate physics on
	@param {array} physics_objs array of objects to calculate physics from
	@returns {number} acceleration to apply in [x,y] form
*/
function calc_grav(obj,physics_objs){
	let xacc = 0;
	let yacc = 0;
	
	let speed;
	let angle;
	
	for(let i=0;i<physics_objs.length;i++){
		
		//only apply physics from planet objects
		if(physics_objs[i].type!="planet"){
			continue;
		}
		speed = newtons_gravity(physics_objs[i].mass,get_distance(physics_objs[i],obj));
		angle = get_angle(physics_objs[i],obj)
		xacc = xacc + vector(speed,angle)[0];
		yacc = yacc + vector(speed,angle)[1];
	}
	
	return [xacc,yacc];
}

/**
	Calculates the distance between two objects
	@param {object} a Object one
	@param {object} b Object two
	@returns {number} distance between a and b
*/
function get_distance(a,b){
	return Math.sqrt(Math.pow(Math.abs(a.x-b.x),2)+Math.pow(Math.abs(a.y-b.y),2));
}

/**
	Calculates the distance between an object and the player. Used for sorting
	@param {object} a Object one
	@returns {number} distance between a and {@link player}
*/
function sort_player_distance(a,b){
	return get_distance(b,current_stage.planets["player"])-get_distance(a,current_stage.planets["player"]);
}

/**
	Calculates the angle between two objects
	@param {object} a Object one
	@param {object} b Object two
	@returns {number} angle between a and b
*/
function get_angle(a,b){
	return Math.PI/-2+Math.atan2(a.y-b.y,a.x-b.x);
}

/**
	Calculates the acceleration due to gravity applied to an object
	@param {number} m Mass of object two
	@param {number} d Distance between the two objects
	@returns {number} Acceleration due to gravity 
*/
function newtons_gravity(m,d){
	return G*m/Math.pow(d,2)
}

/**
	Renders the physics prediction line
	@todo Maybe store this function somewhere better
*/
function draw_path(){	
	ctx.beginPath();
	ctx.moveTo(current_stage.planets["player"].x,current_stage.planets["player"].y);
	ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
	
	//shift to account for faded end to the line
	let shift = 0;
	if(current_stage.planets["player"].rails.length>100){
		shift = 100;
	}
	
	//Main path
	for(let i=0;i<current_stage.planets["player"].rails.length-shift;i++){
		ctx.lineTo(current_stage.planets["player"].rails[i][0],current_stage.planets["player"].rails[i][1]);
	}
	ctx.stroke();
	
	
	//Transparent fade at the end of the path
	ctx.beginPath();
	for(let j=0;j<shift;j++){
		ctx.lineTo(current_stage.planets["player"].rails[current_stage.planets["player"].rails.length-shift+j][0],current_stage.planets["player"].rails[current_stage.planets["player"].rails.length-shift+j][1]);
		ctx.strokeStyle = "rgba(80, 80, 80, "+(0.5*(100-j)/100)+")";
		ctx.stroke();
	}
}

/**
	Left shifts elements in an array
	@param {array} arr array to shift
*/
function left_shift(arr){
	for(let i=0;i<arr.length-1;i++){
		arr[i]=arr[i+1];
	}
}

/**
	Calculates collisions between two objects
	@param {object} object to calculate collisions on
	@param {array} physics_objs array of objects to calculate collisions from
	@returns {boolean} collision happened
*/
function calc_collision(obj,physics_objs,force_shift){
	let shift = 0;
	if(force_shift!=undefined){
		shift = force_shift;
	}
	else if(obj.type==="planet"){
		shift = obj.mass;
	}
	else if(obj.type==="rocket"){
		shift = obj.size/2;
	}
	for(let i=0;i<physics_objs.length;i++){
		if(physics_objs[i].type!="planet"||physics_objs[i]===obj){
			continue;
		}
		if(get_distance(obj,physics_objs[i]) <= physics_objs[i].mass+shift){
			return true;
		}
	}
	return false;
}

/**
	Calculates if x,y is the bounding box formed by xmin,ymin xmax,ymax
	@param {number} xmin x coordinate of the top left corner of the bounding box
	@param {number} xmax x coordinate of the bottom right corner of the bounding box
	@param {number} ymin y coordinate of the top left corner of the bounding box
	@param {number} ymax y coordinate of the bottom right corner of the bounding box
	@returns {boolean} x,y is within xmin,ymin xmax,ymax
*/
function inBounds(x,y,xmin,xmax,ymin,ymax){
	 return (x>xmin && x<xmax && y>ymin && y<ymax);
}

/**
	Generates a random integer between min_b and max_b inclusively
	@param {number} min_b Minimum bound
	@param {number} max_b Maximum bound
	@returns {number} Random integer min_b <= num <= max_b
*/
function ran_b(min_b,max_b){
	return Math.floor( min_b + Math.random()*(max_b+1) );
}

/**
	Generates a random rgb colour
	@returns {string} Random colour
*/
function ran_colour(){
	return "rgb("+ran_b(50,255)+", "+ran_b(50,255)+", "+ran_b(50,255)+")";
}

/**
	gets an element from document
	@param {string} id id of element
	@returns {object} element of document
*/
function get_element(id){
	return document.getElementById(id);
}

/**
	gets a value from document
	@param {string} id id of element
	@returns {object} value of document
*/
function get_val(id){
	return get_element(id).value;
}

/**
	gets an HTML fragment from document
	@param {string} id id of HTML
	@returns {object} HTML of document
*/
function get_HTML(id){
	return get_element(id).innerHTML;
}

/**
	sets an HTML fragment in a document
	@param {string} id id of element
	@param {string} val value of HTML to set to element
*/
function set_HTML(id,val){
	get_element(id).innerHTML = val;
}

/**
	sets a value in a document
	@param {string} id id of element
	@param {string} val value to set to element
*/
function set_val(id,val){
	get_element(id).value = val;
}

/** Gets new physics depth input, validates it, and applies it */
function update_settings(){
	let new_rails = get_val("rails_depth");
	if(!isNaN(new_rails) && parseInt(new_rails)>0){
		if(current_stage!=undefined){
			update_rails(parseInt(new_rails));
		}
	}
	else{
		set_val("rails_depth",rails_depth);
	}
	
}

/** Pauses the game, and sets {@link updateNextControl} to the keybind being updated */
function updateControls(key){
	pause = pause = 1;
	updateNextControl = key;
}

/** Resets all kepresses to off */
function reset_keypress(){
	for(let j=0;j<get_possible_keys().length;j++){
		keyPressMap[get_possible_keys()[j]] = false;
	}
	soundManager["thrust"].pause();
	soundManager["thrust"].currentTime = 0;
}

/**
	Renders a menu
	@param inputs {array} Menu options
	@param display {string} Menu Title
*/
function menu(inputs,display){
	clear_screen();
	ctx.fillStyle = MENU_COLOUR;
	ctx.textAlign = "center";
	let shift_text = 0;
	
	//draw a title
	if(display!=undefined){
		ctx.fillText(display, MAX_X/2, 75);
		shift_text = 50;
	}
	
	//draw each item in a list
	let text_w;
	for(let i=0;i<inputs.length;i++){
		ctx.fillStyle = MENU_COLOUR;
		
		//draw a box around selected item, and invert the colour
		if(menu_selection===i){
			text_w = ctx.measureText(inputs[i]).width
			ctx.fillRect(MAX_X/2-text_w/1.9,90+shift_text+(65*i)-1.286*20,text_w*1.05,1.286*35);
			ctx.fillStyle = "black";
		}
		ctx.fillText(inputs[i],MAX_X/2,100+shift_text+(65*i));
	}
}

/**
	Moves a menu selector up or down with wrapping
	@param key {number} code of key press
	@param selector {number} current selection
	@param options {array} menu options
	@returns new selction
*/
function update_selection(key,selector,options){
	if(key === 40){
		selector = (selector+1) % options.length;
		play_tick_sound();
	}
	else if(key === 38){
		selector = ((selector-1) + options.length) % options.length;
		play_tick_sound();
	}
	return selector;
}

/** Prints the relevent contents of a stage to the console for debug purposes */
function debug_stage(){
	console.log("[,"+current_stage.player_x+","+current_stage.player_y+","+current_stage.player_xs+","+current_stage.player_ys+"]");
	for(let i=0;i<current_stage.planets.length;i++){
		console.log("["+current_stage.planets[i].x+","+current_stage.planets[i].y+",\""+current_stage.planets[i].colour+"\","+current_stage.planets[i].mass+"]");
	}
}

/**
	Inserts an alpha value into a canvas rgb colour
	@param colour {string} colour before alpha
	@param alpha {number} alpha value
	@returns New colour with alpha value
*/
function add_alpha(colour,alpha){
	return "rgba("+colour.substring(4,colour.length-1)+", "+alpha+")";
}

/*
	Sorts highscores by their actual score value
	@param a {array} highscore 1
	@param b {array} highscore 2
	@returns comparison of two highscores
*/
function high_score_sort(a,b){
	return b[1]-a[1];
}

/*	Plays a tick sound.	*/
function play_tick_sound(){
	//This reset was so that ticks would always be played, even if the previous fade out had not yet been completed
	soundManager["tick"].pause();
	soundManager["tick"].currentTime = 0;
	soundManager["tick"].play();
}
