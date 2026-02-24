include <BOSL2/std.scad>

cubeBaseW = 30;
cubeBaseD = 200;
cubeBaseH = 9;

wedgePointH = 20;
wedgePointD = 10;

cubeEmptyW = 10;
cubeEmptyD = 10;
cubeEmptyH = cubeBaseH+1;
cubeEmptyGap = 5; 

cubeEmptyPointW = 20;
cubeEmptyPointD = 15;
cubeEmptyPointH = cubeBaseH;

// Main base
difference() {
    union() {
        diff()
        cube([cubeBaseW,cubeBaseD,cubeBaseH], center=true)
    // Reinforcement points
         position(RIGHT+BOT)
            translate([-cubeBaseW/2,-cubeBaseD/2+wedgePointD/2,wedgePointH/2])
                rotate([0, 0, 0])
                    wedge([cubeBaseW,wedgePointD,wedgePointH], center=true);
    
    

    }
    // Hollow spaces
    for(i = [0, 1, 2,3,4]) {
        translate([-5, i * (cubeEmptyD + cubeEmptyGap), 0])
            cube([cubeEmptyW,cubeEmptyD,cubeEmptyH], center=true);
    }
    
    translate([0,wedgePointD*2,0]){

    // Reinforcement points
    translate([0, -cubeBaseD/2+cubeEmptyPointD/2+cubeEmptyD, 0])
        cube([cubeEmptyPointW,cubeEmptyPointD,cubeEmptyPointH+1], center=true);

    translate([0, -cubeBaseD/2+cubeEmptyPointD/2+cubeEmptyD, 0])
        rotate([0, 90, 0])
             cylinder(h=cubeBaseW+1, r=1.5, center=true);
}
     //Decoration 
translate([-8, cubeBaseD/2-15/2+1, 0])
    rotate([90, 90, 0])
        wedge([cubeBaseH+2,14,14], center=true);
}

// Side support
translate([45,0,0]){
    difference() {
    union() {
        diff()
        translate([0,wedgePointD+2.5,cubeBaseH*1.75])
            cube([cubeBaseW,cubeBaseD-wedgePointD*3-cubeEmptyPointD, cubeBaseH], center=true);
        
        translate([0,wedgePointD,3]){
                translate([0, -cubeBaseD/2+cubeEmptyPointD/2+cubeEmptyD*1.5, cubeBaseH-0.5])
            rotate([42.5, 0, 0])
                cube([cubeEmptyPointW-0.5,cubeEmptyPointD,cubeEmptyPointH], center=true);

        translate([0, -cubeBaseD/2+cubeEmptyPointD/2+cubeEmptyD+3, cubeBaseH/2+2])
            rotate([0, 90, 0])
                cylinder(h=cubeEmptyPointW-0.5, r=2.5, center=true);
        }


        

        }
    translate([0,-30+wedgePointD*1.5,0]){
    

                
    translate([-5, cubeEmptyD + cubeEmptyGap, cubeBaseH*1.75])
            cube([cubeEmptyW,cubeEmptyD*1.5,cubeEmptyH], center=true);
    

    translate([-5, cubeEmptyD + cubeEmptyGap, cubeBaseH*1.75])
        rotate([0, 90, 0])
             cylinder(h=cubeEmptyD*2.1, r=1.5, center=true);
    
    translate([-cubeEmptyW/2,wedgePointD+cubeEmptyD*1.5,cubeBaseH*1.75])
            wedge([cubeEmptyW,wedgePointD/2,cubeBaseH], center=true);

    translate([-cubeEmptyW/2,wedgePointD*2-cubeEmptyD*1.5,cubeBaseH*1.75])
        rotate([0, 0, 180])
            wedge([cubeEmptyW,wedgePointD/2,cubeBaseH], center=true);
    
    
            
    
    }

    translate([0,wedgePointD,3]){
    translate([0, -cubeBaseD/2+cubeEmptyPointD/2+cubeEmptyD+3, cubeBaseH/2+2])
            rotate([0, 90, 0])
                cylinder(h=cubeEmptyPointW+1, r=1.5, center=true);
    }

    translate([0,0,cubeBaseH])
        rotate([0, 90, 0])
            cylinder(h=cubeBaseW+1, r=1.5, center=true);


    translate([7.5, cubeEmptyD + cubeEmptyGap*10 - wedgePointD - 5, cubeBaseH*1.75])
            cube([3.5,50,cubeEmptyH], center=true);

    translate([7.5, -cubeEmptyD*2 - cubeEmptyGap/10 - wedgePointD/3, cubeBaseH*1.75])
            cube([3.5,50,cubeEmptyH], center=true);


    //decoration
    translate([12, cubeBaseD/2-15/2+4-wedgePointD, cubeBaseH*1.75])
    rotate([180, 90, 0])
        wedge([cubeBaseH+2,7,7], center=true);
    }
    
}

// Side support 2
translate([90,0,0]){
    difference() {
    union() {
        diff()
        translate([0,-wedgePointD-7,cubeBaseH-0.5])
            cube([cubeEmptyW-0.5,(cubeBaseD-wedgePointD-cubeEmptyPointD)/2.8, cubeBaseH-1.5], center=true);


        translate([0,12,0]){
            translate([0, -cubeBaseD/2+cubeEmptyPointD/2+cubeEmptyD*2+wedgePointD+4.75, cubeBaseH*1.7])
        rotate([0, 90, 0])
             cylinder(h=cubeEmptyW-0.5, r=3, center=true);
        
        translate([0, -cubeBaseD/2+cubeEmptyPointD/2+cubeEmptyD*2+14.75, cubeBaseH*1.6])
        rotate([0, 90, 90])
             cube([cubeEmptyW/2,cubeEmptyW-0.5,cubeEmptyH/2], center=true);


        }
        
        }
        translate([0,12,0]){
        translate([0, -cubeBaseD/2+cubeEmptyPointD/2+cubeEmptyD*2+wedgePointD+4.75, cubeBaseH*1.7])
        rotate([0, 90, 0])
             cylinder(h=cubeEmptyW+1, r=1.5, center=true);
             }
                    translate([0,(cubeBaseD-wedgePointD-cubeEmptyPointD)/2.8/4-4,cubeBaseH-0.5])
            rotate([0, 0, 180])
                wedge([cubeBaseH+3,8,8], center=true);
        
    }
    
}


// Side support 3

translate([135,0,0]){
    difference() {
    union() {
        diff()
        translate([0,-wedgePointD-7,cubeBaseH-0.5])
            cube([cubeEmptyW-3,(cubeBaseD-wedgePointD-cubeEmptyPointD)/3, cubeBaseH/2], center=true);
        
        translate([2.5,-wedgePointD-7+(cubeBaseD-wedgePointD-cubeEmptyPointD)/3/2,cubeBaseH-0.5])
            cylinder(h=cubeBaseH/2, r=8, center=true);
        
        translate([5.5,-wedgePointD-7+(cubeBaseD-wedgePointD-cubeEmptyPointD)/3,cubeBaseH-0.5])
            cube([cubeEmptyW-3,(cubeBaseD-wedgePointD-cubeEmptyPointD)/3, cubeBaseH/2],center=true);
        }
        translate([2.5,-wedgePointD-7+(cubeBaseD-wedgePointD-cubeEmptyPointD)/3/2,cubeBaseH-0.5])
            cylinder(h=cubeBaseH+1, r=1.5, center=true);

        translate([0,-wedgePointD-4-(cubeBaseD-wedgePointD-cubeEmptyPointD)/3/2,cubeBaseH-0.5])
            cylinder(h=cubeBaseH+1, r=1.5, center=true);
            
        translate([5.5,(cubeBaseD-wedgePointD-cubeEmptyPointD)/3+wedgePointD-1,cubeBaseH-0.5])
            cylinder(h=cubeBaseH, r=1.5, center=true);
    }   
    
}