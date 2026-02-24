include <BOSL2/std.scad>
prismoidW = 20;

difference() {
    union() {
        diff()
        prismoid(size1=[200,prismoidW], size2=[0,prismoidW], shift=[-133.33,0], h=100) {

            
            position(RIGHT+BOT)
                translate([-15,0,15])
                    rotate([0, 0, 90])
                        wedge([20,30,30], center=true);

            position(RIGHT+BOT)
                translate([-110,12,5])
                    wedge([170,10,10], center=true);

            
            position(RIGHT+BOT)
                translate([-110,-12,5])
                    rotate([0, 0, 180])
                        wedge([170,10,10], center=true);
        }
    }
    
translate([-50, 0, 8.33])
    prismoid(size1=[70,prismoidW+1], size2=[0,prismoidW+1], shift=[-20,0], h=36);
  
    translate([-104.17, 0, 45.83])
        rotate([0, 72.5, 0])
              prismoid(size1=[75,prismoidW+1], size2=[0,prismoidW+1], shift=[5,0], h=26);

translate([-58.33, 0, 50])
    rotate([0, 35, 0])
        prismoid(size1=[100,prismoidW+1], size2=[0,prismoidW+1], shift=[66.67,0], h=20.83);

translate([33.33, 0, 8.33])
    rotate([0, -10, 0])
        prismoid(size1=[33.33,prismoidW+1], size2=[25,prismoidW+1], shift=[-25,0], h=14.17);
}

// translate([-120, -3.5, 90])
//     rotate([23, 0, 90]) {
//         clipW = 13;
//         clipH = 8;
//         clipGap = 20;
//         cuboid([15, clipW, clipH], center=false);
//         translate([0, 0, clipGap + clipH])
//         cuboid([15, clipW, clipH], center=false);
//         translate([-12, 0, (clipGap + clipH)/2 ])
//         cuboid([10, clipW, clipGap + clipH * 2], center=false);
//     }

