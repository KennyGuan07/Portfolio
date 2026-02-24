include <BOSL2/std.scad>
include <BOSL2/screws.scad>

cubeHeadW = 35;
cubeHeadD = 35;
cubeHeadH = 32.5;

cubeBottomW = 80;
cubeBottomD = 50;   
cubeBottomH = 32.5;

tubeHeadW = 25.3;
tubeHeadD = cubeHeadD;
tubeHeadH = 28;

tubeHeadGapW = 40;
tubeHeadGapD = 3;
tubeHeadGapH = 25;

tubeBottomW = 25.3;
tubeBottomD = 25.3; 
tubeBottomH = 25.3;

emptyGap = 0.008;
screw_hole_diameter = 3;
M3size = 3;

// Head
difference() {
    union() {
        diff()
        cube([cubeHeadW ,cubeHeadD ,cubeHeadH ], center=true);


    }



    translate([0, -cubeHeadD/2 + tubeHeadGapD*2+7, cubeHeadH/2])
        cube([tubeHeadGapW + emptyGap,tubeHeadGapD + emptyGap,tubeHeadGapH + emptyGap], center=true);


    translate([0, cubeHeadD/2-M3size*2, cubeHeadH/2-M3size*2])
        rotate([0, 90, 0])
        screw_hole("M3", head="socket", length=cubeHeadH + emptyGap);



    translate([0, 0, cubeHeadH/4-1])
        cube([tubeHeadW + emptyGap,tubeHeadD + emptyGap,tubeHeadH + emptyGap], center=true); 
}

//Bottom
difference() {
    union() {
        diff()
        translate([0, -cubeHeadD, 0])
        cube([cubeBottomW,cubeBottomD,cubeBottomH], center=true);

         
        
    }


    translate([0, -cubeHeadD-tubeBottomD/2 + (cubeHeadD-tubeBottomD)/2, 0])
        cube([cubeBottomW + emptyGap,tubeBottomD*2 + emptyGap,tubeBottomH + emptyGap], center=true); 


    
    translate([cubeHeadD-5,-cubeHeadD-tubeBottomD/2,0])
        screw_hole("M3", head="socket", length=cubeBottomH + emptyGap);

    translate([-cubeHeadD+5,-cubeHeadD-tubeBottomD/2,0])
        screw_hole("M3", head="socket", length=cubeBottomH + emptyGap);




     translate([0, -cubeHeadD-tubeBottomD/2 + (cubeHeadD-tubeBottomD)/2, 0])
        cube([cubeHeadW + emptyGap,tubeBottomD*2 + emptyGap,cubeBottomH + emptyGap], center=true); 

    translate([0, -cubeBottomD-cubeHeadD/2 , 0]) 
        cube([cubeBottomW + emptyGap, tubeHeadGapH + emptyGap,cubeBottomH + emptyGap], center=true);

            
    translate([0, -cubeHeadD-tubeBottomD/2 + (cubeHeadD-tubeBottomD)/2, tubeHeadH])
        cube([tubeHeadW + emptyGap,tubeHeadD*2 + emptyGap,tubeHeadH*2.5 + emptyGap], center=true); 
        
    }

