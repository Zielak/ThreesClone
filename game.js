
Array.prototype.contains = function ( needle ) {
   for (i in this) {
       if (this[i] == needle) return true;
   }
   return false;
}











var GAME_OVER = 'gameOver';
var GAME_PLAYING = 'gamePlaying';
var BLOCK_ZERO = {x:-1, y:-1, v:0};
var TAP_DEFAULT = {
  down: false,
  start: {x:0, y:0},
  end: {x:0, y:0},
  direction: -1
};
var NULL_SPAWN_BLOCK = {x:-1, y:-1, v:-1};













var Game = (function(){

  var
    debug = false,

    // 2D array of blocks currently in game
    blocks,

    // Last state of `blocks` array, for debug undo
    blocksLastState,
    lastBlockSpawn = NULL_SPAWN_BLOCK,
    undoing = false,

    // Remember all spawned blocks and make sure that Math.random won't get on our nerves
    blocksLog = [0,0,0],

    // Visual place to show blocks
    blocksNode = $('.blocks'),

    // List of blocks to deal with in delayed update
    blocksToUpdate = [],

    // Visual stuff
    gameSize = (window.innerHeight > window.innerWidth) ? window.innerWidth - 100 : window.innerHeight - 100,
    scene = {
      col: gameSize/4,
      row: gameSize/4,
      xmax: 4,
      ymax: 4,
      fontSize: gameSize/8.5
    },

    gameState = GAME_PLAYING,

    movesPossible = true,

    // Move speed, sync it with CSS transitions
    moveSpeed = 200,
    moving = false,

    // touch/mouse events data
    tap = TAP_DEFAULT,
    // Fast typer, store the nest desired move
    keyNext = 0
  ;


  // Init game
  // TODO: update all those visuals on resize?
  $('.game').css({
    width:gameSize,
    height:gameSize
  });
  $('.box').css({
    width: gameSize/4,
    height: gameSize/4,
    borderWidth: gameSize/50
  });
  $('.gameOver').css({
    width:gameSize/2,
    height:gameSize/2,
  });
  // $('input').css({
  //   fontSize: scene.fontSize/5
  // })
  $('html').css({
    fontSize: scene.fontSize / 2.5,
  })

  if(debug) $('body').addClass('debug');


  function reset(addBlocks){
    addBlocks = (typeof addBlocks === "undefined") ? 2 : addBlocks;
    movesPossible = true;
    tap = TAP_DEFAULT;

    blocks = [[]];

    for (var x = 0; x < 4; x++) {
      blocks[x] = [];
      for (var y = 0; y < 4; y++) {
        blocks[x][y] = BLOCK_ZERO;
      };
    };

    blocksNode.empty();

    // Add N new blocks
    for (var i = 0; i < addBlocks; i++) {
      addRandomBlock();
    };
  }

  /*
   * Undo - for debugging only, revert last state, before the swipe
   * TODO: Make it actually work... :D
  */
  function undo(){
    undoing = true;
    reset(0);

    // Recover last known state
    for (var x = 0; x < 4; x++) {
      for (var y = 0; y < 4; y++) {
        if(blocksLastState[x][y] > 0)
          addBlock(x, y, blocksLastState[x][y]);
        // blocks[x][y] = blocksLastState[x][y];
      };
    };

  }



  $(document).ready(function(){
    reset();
    initGameEvents();
  })

  /*
    getBlocks - get array of blocks on stage
  */
  function getBlocks(){
    return blocks;
  }





  /* ###################################################
   *  Event Listeners
   * ################################################### */
  function initGameEvents () {

    document.addEventListener("touchstart", eHandleStart, false);
    document.addEventListener("touchend", eHandleEnd, false);
    document.addEventListener("touchcancel", eHandleCancel, false);
    document.addEventListener("touchleave", eHandleLeave, false);
    document.addEventListener("touchmove", eHandleMove, false);

    document.addEventListener("mousedown", eHandleStart, false);
    document.addEventListener("mouseup", eHandleEnd, false);
    document.addEventListener("mouseleave", eHandleLeave, false);
    document.addEventListener("mousemove", eHandleMove, false);
  }
  function removeGameEvents(){
    document.removeEventListener("touchstart", eHandleStart, false);
    document.removeEventListener("touchend", eHandleEnd, false);
    document.removeEventListener("touchcancel", eHandleCancel, false);
    document.removeEventListener("touchleave", eHandleLeave, false);
    document.removeEventListener("touchmove", eHandleMove, false);

    document.removeEventListener("mousedown", eHandleStart, false);
    document.removeEventListener("mouseup", eHandleEnd, false);
    document.removeEventListener("mouseleave", eHandleLeave, false);
    document.removeEventListener("mousemove", eHandleMove, false);
  }


  // Keyboard input
  document.onkeydown = function(evt) {
    if(gameState !== GAME_PLAYING){
      if(gameState === GAME_OVER) ePlayAgain();
    };
    keyMove(evt, false);
  };
  document.onkeyup = function(evt){
    keyMove(evt, true);
  };

  function keyMove(evt, up){
    if(stillMoving()){
      return
    };
    if( evt.keyCode == 90 ){
      undo();
      return;
    }
    if( evt.keyCode < 37 || evt.keyCode > 40 ) return;

    keyNext = evt.keyCode;

    evt = evt || window.event;
    switch (evt.keyCode) {
      case 38:
        swipe(0); break;
      case 39:
        swipe(1); break;
      case 40:
        swipe(2); break;
      case 37:
        swipe(3); break;
    }
    // finish and reset last direction
    tap.direction = -1;
  }

  // Game over buttons
  function initGameOverEvents(){
    btnPlayAgain.addEventListener("mouseup", ePlayAgain, false);
    btnPlayAgain.addEventListener("touchend", ePlayAgain, false);
  }
  function removeGameOverEvents(){
    btnPlayAgain.removeEventListener("mouseup", ePlayAgain, false);
    btnPlayAgain.removeEventListener("touchend", ePlayAgain, false);
  }

  // Cancel any actions if blocks are still moving to their target positions
  function stillMoving(){
    if(!moving) return false;
    tap = TAP_DEFAULT;
    return true;
  }

  function touchDown(x,y){
    tap.down = true;
    tap.start = {x:x, y:y};
    if(debug) $('body').css({background: '#eee'});
  }
  function touchUp(x,y){
    tap.down = false;

    if(debug) $('body').css({background: 'white'});

    swipe(tap.direction);

    // finish and reset last direction
    tap.direction = -1;
  }
  function eHandleStart(evt){
    if(gameState !== GAME_PLAYING) return;
    if(stillMoving()) return;

    if(typeof evt.touches === "object"){
      touchDown(evt.touches[0].pageX, evt.touches[0].pageY);
    }else{
      touchDown(evt.x, evt.y);
    }
  }

  function eHandleEnd(evt){
    if(gameState !== GAME_PLAYING) return;
    if(stillMoving()) return;

    touchUp();
  }

  function eHandleCancel(evt){
    if(gameState !== GAME_PLAYING) return;
    if(stillMoving()) return;

    touchUp();
  }
  function eHandleLeave(evt){
    if(gameState !== GAME_PLAYING) return;
    if(stillMoving()) return;

    touchUp();
  }
  function eHandleMove(evt){
    if(gameState !== GAME_PLAYING) return;

    if(tap.down && !stillMoving()){
      if(typeof evt.touches === "object"){
        tap.end = {x:evt.touches[0].pageX, y:evt.touches[0].pageY};
      }else{
        tap.end = {x:evt.x, y:evt.y};
      }

      // Set CSS-like direction
      tap.direction = get4Direction(tap.start.x - tap.end.x, tap.start.y - tap.end.y);

      if(debug) $('#tapStart').css({top:tap.end.y+'px',left:tap.end.x+'px'});
      if(debug) $('#tapEnd').css({top:tap.start.y+'px',left:tap.start.x+'px'}).text(tap.direction);

    }
    // Prevent drag selecting whole page
    if(evt.stopPropagation) evt.stopPropagation();
    if(evt.preventDefault) evt.preventDefault();
    evt.cancelBubble=true;
    //e.returnValue=false;
    return false;
  }
  function get4Direction(x,y){

    // Normalize "vector"
    var length = Math.sqrt((x * x) + (y * y));
    x = x/length;
    y = y/length;

    /*
          U(0,-1)
      L(-1,0)  R(1,0)
          D(0,1)
    */

    if(y >= 0.5) return 0;
    if(x <= -0.5) return 1;
    if(y <= -0.5) return 2;
    if(x >= 0.5) return 3;
  }


  function ePlayAgain(evt){
    if(gameState === GAME_OVER) setGameState(GAME_PLAYING);
  }








  /* ###################################################
   *  Swipe, move blocks
   * ################################################### */


  function combineBlocks(xa, ya, xb, yb){
    blocks[xa][ya].justCombined = true;

    // Mark the other block for removal
    blocks[xb][yb].node[0].classList.add('toRemove');
    var left = xb * scene.col;
    var top = yb * scene.row;
    blocks[xb][yb].node[0].style.webkitTransform = 'translate3d('+left+'px,'+top+'px,0) scale3d(0.5, 0.5, 0.5)';


    // Replace target spot in array
    blocks[xb][yb] = blocks[xa][ya];

    // Update value and move
    blocks[xa][ya].combineWith(xb, yb);

    // Update visual value
    blocks[xa][ya].node[0].childNodes[0].innerHTML = blocks[xa][ya].v;

    // Update class block number, remember to keep all other classes
    var index = -1;
    var test;
    for (var i = blocks[xa][ya].node[0].classList.length - 1; i >= 0; i--) {
      try {
        test = blocks[xa][ya].node[0].classList[i].match(/block([0-9]*)/)[1];
      }
      catch (e) {
        // statements to handle any exceptions
        console.log(e); // pass exception object to error handler
        continue; // nothing to do here
      }
      if( !isNaN( parseInt(test) ) ){
        index = i;
      }
    };
    blocks[xa][ya].node[0].classList.remove( blocks[xa][ya].node[0].classList[index] );
    blocks[xa][ya].node[0].classList.add('block'+blocks[xa][ya].v);

    // Update old position in array
    blocks[xa][ya] = BLOCK_ZERO;
  }

  function moveBlock(xa, ya, xb, yb){
    // Update new position in array
    blocks[xb][yb] = blocks[xa][ya];

    // Move block to new position
    blocks[xa][ya].moveTo(xb, yb);

    // Update old position in array
    blocks[xa][ya] = BLOCK_ZERO;
  }

  function swipe(dir){
    if(dir > 3 || dir < 0) return false;
    var x, y;
    var blocksMoved = 0;

    // Entry
    if(debug) console.log('Direction: ', dir);
    moving = true;

    // Make possible for undo
    // Copy only values instead of whole objects
    blocksLastState = [[]];
    for (x = 0; x < 4; x++) {
      blocksLastState[x] = [];
      for ( y = 0; y < 4; y++) {
        blocksLastState[x][y] = blocks[x][y].v;
      };
    };

    setTimeout(function(){
      moving = false;
    },moveSpeed);


    if(dir === 0){
      // for every collumn, ignoring top most blocks
      for (y = 1; y <= 3; y++) {
        
        // for each block, 
        // seek for finish pos
        for (x = 0; x <= 3; x++) {

          // Does this block exist?
          if(blocks[x][y].v === 0) continue;

          goTo = seek(dir, x, y, blocks[x][y].v);
          switch(goTo.type){
            case "nope":
              continue;
            case "combine":
              combineBlocks(x, y, x, goTo.go); break;
              break;
            case "move":
              moveBlock(x, y, x, goTo.go); break;
          }
          blocksMoved ++;
        }
      };
    }else if(dir === 1){
      // for every collumn, ignoring bottom blocks
      for (x = 2; x >= 0; x--) {
        
        // for each block, 
        // seek for finish pos
        for (y = 0; y <= 3; y++) {

          // Does this block exist?
          if(blocks[x][y].v === 0) continue;

          goTo = seek(dir, x, y, blocks[x][y].v);

          switch(goTo.type){
            case "nope":
              continue;
            case "combine":
              combineBlocks(x, y, goTo.go, y); break;
              break;
            case "move":
              moveBlock(x, y, goTo.go, y); break;
          }
          blocksMoved ++;
        }
      };
    }else if(dir === 2){
      // for every collumn, ignoring bottom blocks
      for (y = 2; y >= 0; y--) {
        
        // for each block, 
        // seek for finish pos
        for (x = 0; x <= 3; x++) {

          // Does this block exist?
          if(blocks[x][y].v === 0) continue;

          goTo = seek(dir, x, y, blocks[x][y].v);

          switch(goTo.type){
            case "nope":
              continue;
            case "combine":
              combineBlocks(x, y, x, goTo.go); break;
              break;
            case "move":
              moveBlock(x, y, x, goTo.go); break;
          }
          blocksMoved ++;
        }
      };
    }else if(dir === 3){
      // for every row, ignoring left most blocks
      for (x = 1; x <= 3; x++) {
        
        // for each block, 
        // seek for finish pos
        for (y = 0; y <= 3; y++) {

          // Does this block exist?
          if(blocks[x][y].v === 0) continue;
          if(debug) console.log('it does exist',x,y);
          goTo = seek(dir, x, y, blocks[x][y].v);

          switch(goTo.type){
            case "nope":
              continue;
            case "combine":
              combineBlocks(x, y, goTo.go, y); break;
              break;
            case "move":
              moveBlock(x, y, goTo.go, y); break;
          }
          blocksMoved ++;
        }
      };
    }


    // Delay removing and animations
    setTimeout(function(){
      // Remove remaining ghosts
      $('.toRemove').remove();

      // Finish up combined blocks
      $('.toCombine').removeClass('toCombine');

      for (var x = 0; x < 4; x++) {
        for (var y = 0; y < 4; y++) {
          if(blocks[x][y].v > 0/* && !blocks[x][y].node[0].classList.contains('toRemove')*/) {

            // Update block's values if needed
            if(blocks[x][y].justCombined){
              blocks[x][y].justCombined = false;
            }
          }
        };
      };

    },moveSpeed);





    // Finish game if no moves are possible.
    if(countBlocks() == scene.xmax * scene.ymax){
      movesPossible = updatePossibleMoves();
    }

    if(!movesPossible){
      setGameState(GAME_OVER);
    }

    if(dir >= 0 && blocksMoved > 0 && movesPossible){
      setTimeout( function(){
        addRandomBlock();

      }, moveSpeed-50);
    }

  }

  function seek(dir,x,y,v){
    var go = -1;
    var type = "nope";
    var i, bv;

    if(dir === 0){
      for(i=y-1; i>=0; i--){
        bv = blocks[x][i].v;
        if(bv === 0){
          go = i;
          type = "move";
        }else{
          if( ((v >= 3 && bv === v) ||
              (v === 1 && bv === 2) ||
              (v === 2 && bv === 1)) && !blocks[x][i].justCombined){
            go = i;
            type = "combine";
          }
          break;
        }
      }
    }else if(dir === 1){
      for(i=x+1; i<=3; i++){
        bv = blocks[i][y].v;
        if(bv === 0){
          go = i;
          type = "move";
        }else{
          if( ((v >= 3 && bv === v) ||
              (v === 1 && bv === 2) ||
              (v === 2 && bv === 1)) && !blocks[i][y].justCombined){
            go = i;
            type = "combine";
          }
          break;
        }
      }
    }else if(dir === 2){
      for(i=y+1; i<=3; i++){
        bv = blocks[x][i].v;
        if(bv === 0){
          go = i;
          type = "move";
        }else{
          if( ((v >= 3 && bv === v) ||
              (v === 1 && bv === 2) ||
              (v === 2 && bv === 1)) && !blocks[x][i].justCombined){
            go = i;
            type = "combine";
          }
          break;
        }
      }
    }else if(dir === 3){
      for(i=x-1; i>=0; i--){
        bv = blocks[i][y].v;
        if(bv === 0){
          go = i;
          type = "move";
        }else{
          if( ((v >= 3 && bv === v) ||
              (v === 1 && bv === 2) ||
              (v === 2 && bv === 1)) && !blocks[i][y].justCombined){
            go = i;
            type = "combine";
          }
          break;
        }
      }
    }
    return {go: go, type: type};
  }








  /* ###################################################
   *  BLOCKS
   * ################################################### */


  // returns random empty space, -1 if no empty space!
  function addRandomBlock(){
    //wait = false;

    // if Undoing, spawn new block exacly when we spawned last time
    if(undoing){
      undoing = false;

      var newBlock = new Block({
        x: lastBlockSpawn.x, y: lastBlockSpawn.y, v: lastBlockSpawn.v
      });
      blocksNode.append(newBlock.node);

      newBlock.moveTo(lastBlockSpawn.x, lastBlockSpawn.y);

      blocks[lastBlockSpawn.x][lastBlockSpawn.y] = newBlock;

      return;
    }

    // prepare array to store if already looked at certain cell
    var checked = [[]];
    var x, y;

    for (x = 0; x < 4; x++) {
      checked[x] = [];
      for ( y = 0; y < 4; y++) {
        checked[x][y] = false;
      };
    };


    // Start seeking for empty space
    var blocksCount = blocks.length * blocks[0].length;
    var blocksChecked = 0;
    do{
      // Lottery!
      x = Math.round(Math.random() * (scene.xmax-1));
      y = Math.round(Math.random() * (scene.ymax-1));

      // Don't look at it again if we already checked here
      if(checked[x][y] === true){
        continue;
      }

      // See it it's empty
      if (blocks[x][y].v === 0) {
        break;
      }else{
        checked[x][y] = true;
        blocksChecked ++;
      }

    } while (blocksChecked != blocksCount);


    // We still have some place
    if(blocksChecked < blocksCount){

      // Decide what value we want
      // this iterates through array twice, so it's unwise to use
      // this method on bigger arrays
      var max = blocksLog.indexOf(Math.max.apply(Math, blocksLog));
      var tmpVal = [];
      // Pick between 2 lowest values, we don't wanna spawn the top most block
      if(max!==0)tmpVal.push(1);
      if(max!==1)tmpVal.push(2);
      if(max!==2)tmpVal.push(3);


      var newVal = tmpVal[Math.round(Math.random())];

      // update the back log
      blocksLog[newVal-1] = blocksLog[newVal-1]+1;

      var newBlock = new Block({
        x: x, y: y, v: newVal
      });
      blocksNode.append(newBlock.node);

      newBlock.moveTo(x, y);

      blocks[x][y] = newBlock;
      lastBlockSpawn = {x:x, y:y, v:newVal};

      return true;
    }else{
      return false;
    }

  }


  function addBlock(_x,_y,_v){
    var x = _x || 0;
    var y = _y || 0;
    var v = _v || 1;

    // Check if desired spot is empty
    if(blocks[x][y].v !== 0){
      return false;
    }

    // We still have some place
    var newBlock = new Block({
      x: x, y: y, v: v
    });
    blocksNode.append(newBlock.node);

    newBlock.moveTo(x, y);

    blocks[x][y] = newBlock;
  }

  function setBlockZero (x,y) {
    if(blocks[x][y].v !== 0){
      blocks[x][y] = BLOCK_ZERO;
    }
  }










  /* ###################################################
   *  GameState
   * ################################################### */

  function countBlocks(){
    var x, y;
    var i = 0;

    for (var x = 0; x < scene.xmax; x++) {
      for (var y = 0; y < scene.ymax; y++) {
        if(blocks[x][y].v > 0){
          i++;
        }
      }
    }
    return i;
  }
  function updatePossibleMoves(){
    var x, y, v, i, bv;

    for(x=0; x<=3 ; x++){
      for(y=0; y<=3 ; y++){
        v = blocks[x][y].v;

        // if(dir === 0){
        for(i=y-1; i>=0; i--){
          bv = blocks[x][i].v;
          if( (v >= 3 && bv === v) || (v === 1 && bv === 2) || (v === 2 && bv === 1)){
            return true;
          }
          break;
        }
        // }else if(dir === 1){
        for(i=x+1; i<=3; i++){
          bv = blocks[i][y].v;
          if( (v >= 3 && bv === v) || (v === 1 && bv === 2) || (v === 2 && bv === 1)){
            return true;
          }
          break;
        }
        // }else if(dir === 2){
        for(i=y+1; i<=3; i++){
          bv = blocks[x][i].v;
          if( (v >= 3 && bv === v) || (v === 1 && bv === 2) || (v === 2 && bv === 1)){
            return true;
          }
          break;
        }
        // }else if(dir === 3){
        for(i=x-1; i>=0; i--){
          bv = blocks[i][y].v;
          if( (v >= 3 && bv === v) || (v === 1 && bv === 2) || (v === 2 && bv === 1)){
            return true;
          }
          break;
        }
        //}
      }
    }

    return false;
  }
  function setGameState(newState){
    if(newState === GAME_OVER){
      $('.gameOver').addClass('show');
      removeGameEvents();
      initGameOverEvents();
    }else if(newState === GAME_PLAYING){
      $('.gameOver').removeClass('show');
      reset();
      removeGameOverEvents();
      initGameEvents();
    }
    gameState = newState;
  }



  return {
    scene: scene,
    gameSize: gameSize,
    blocksNode: blocksNode,
    getBlocks: getBlocks,

    reset: reset,
    addBlock: addBlock,
    swipe: swipe,
    undo: undo
  }

})();













function Block(options){

  if(typeof options === "undefined") options = {};

  this.x = (typeof options.x === "undefined") ? 0 : options.x;
  this.y = (typeof options.y === "undefined") ? 0 : options.y;
  this.v = (typeof options.v === "undefined") ? 0 : options.v; // Value
  this.justCombined = false;
  
  this.node = $('<div class="block"><span>'+this.v+'</span></div>');
  

  // Set visuals
  //this.node[0].classList.add('justSpawned');
  this.node[0].style.width = (Game.scene.col-Game.gameSize/30)+'px';
  this.node[0].style.height = (Game.scene.row-Game.gameSize/30)+'px';
  this.node[0].style.borderWidth = (Game.gameSize/70)+'px';

  this.node[0].childNodes[0].style.marginTop = (-Game.scene.fontSize/1.8)+'px';
  this.node[0].childNodes[0].style.fontSize = Game.scene.fontSize+'px';

  this.node[0].style.webkitTransform = 'translate3d(0,0,0) scale3d(0.5,0.5,0.5)';
  this.node[0].classList.add('block'+this.v);


  return this;
}

Block.prototype.moveTo = function(x, y) {
  // set new position
  this.x = x;
  this.y = y;

  // Animate movement with CSS
  var left = this.x * Game.scene.col + Game.gameSize/60;
  var top = this.y * Game.scene.row + Game.gameSize/60;

  this.node[0].style.webkitTransform = 'translate3d('+left+'px,'+top+'px,0) scale3d(1,1,1)';

  // TODO: Don't need it.
  // Lastly, update block node's ID
  // this.node[0].id = 'block'+this.x+this.y;
};

Block.prototype.combineWith = function(x, y) {
  // Add value
  this.v = (this.v < 3) ? this.v = 3 : this.v*2;

  this.moveTo(x,y);
};




