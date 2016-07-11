
// Manual, visual testing. Call test.testRowX(Y) to see results.

var Test = function(){

  function before(){
    Game.reset(0);
  }

  this.testRow1 = function(y){
    before();
    Game.addBlock(0,y,1);
    Game.addBlock(1,y,2);
    Game.addBlock(2,y,1);
    Game.addBlock(3,y,2);
  }
  this.testRow2 = function(y){
    before();
    Game.addBlock(0,y,1);
    Game.addBlock(1,y,2);
    Game.addBlock(2,y,2);
    Game.addBlock(3,y,1);
  }

  this.testRow3 = function(y){
    before();
    Game.addBlock(0,y,3);
    Game.addBlock(1,y,3);
    Game.addBlock(2,y,3);
    Game.addBlock(3,y,3);
  }
  this.testRow4 = function(y){
    before();
    Game.addBlock(0,y,3);
    Game.addBlock(1,y,6);
    Game.addBlock(2,y,6);
    Game.addBlock(3,y,3);
  }
  this.testRow5 = function(y){
    before();
    Game.addBlock(0,y,6);
    Game.addBlock(1,y,3);
    Game.addBlock(2,y,3);
    Game.addBlock(3,y,3);
  }


  this.testRow6 = function(y){
    before();
    Game.addBlock(0,y,1);
    Game.addBlock(1,y,2);
    Game.addBlock(2,y,3);
    Game.addBlock(3,y,3);
  }

}


var test = new Test();
