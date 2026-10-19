import * as THREE from 'three';

// ====================== 1. 场景基础初始化 ======================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 18, 12);
camera.lookAt(0,0,0);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
document.body.appendChild(renderer.domElement);

// 灯光
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);
scene.add(new THREE.AmbientLight(0xffffff,0.4));

// 地面
const groundGeo = new THREE.PlaneGeometry(30,30);
const groundMat = new THREE.MeshStandardMaterial({color:0x55aa55});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// ====================== 2. 玩家对象 + 鼠标控制 ======================
const playerGeo = new THREE.SphereGeometry(0.6,16,16);
const playerMat = new THREE.MeshStandardMaterial({color:0x4488ff});
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 0.6;
scene.add(player);

// 鼠标射线相关
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0),0);
const targetPlayerPos = new THREE.Vector3();

window.addEventListener('mousemove',(e)=>{
    // 转换鼠标坐标到 [-1,1]
    mouse.x = (e.clientX / window.innerWidth)*2 -1;
    mouse.y = -(e.clientY / window.innerHeight)*2 +1;
    raycaster.setFromCamera(mouse,camera);
    // 射线求交地面平面，得到目标位置
    raycaster.ray.intersectPlane(groundPlane, targetPlayerPos);
    targetPlayerPos.y = 0.6;
});

// ====================== 3. 全局游戏状态变量 ======================
let score = 0;
let hp = 3;
let gameOver = false;
let spawnTimer = 0;
let dropSpeed = 0.06;    // 物体下落速度
let spawnInterval = 120; // 生成帧间隔，越小生成越快

const rockList = [];
const foodList = [];

// UI元素
const scoreDom = document.getElementById('score');
const hpDom = document.getElementById('hp');
const gameOverDom = document.getElementById('gameOver');
const restartBtn = document.getElementById('restartBtn');
restartBtn.onclick = resetGame;

// ====================== 4. 生成物体函数 ======================
// 生成落石
function createRock(){
    const size = Math.random()*0.4 +0.4;
    const geo = new THREE.SphereGeometry(size,10,10);
    const mat = new THREE.MeshStandardMaterial({color:0x777777});
    const rock = new THREE.Mesh(geo,mat);
    rock.position.set(
        (Math.random()-0.5)*24,
        12,
        (Math.random()-0.5)*24
    );
    rock.userData.radius = size;
    scene.add(rock);
    rockList.push(rock);
}

// 生成食物
function createFood(){
    const geo = new THREE.SphereGeometry(0.3,12,12);
    const mat = new THREE.MeshStandardMaterial({color:0xffdd00,emissive:0xffdd00,emissiveIntensity:0.2});
    const food = new THREE.Mesh(geo,mat);
    food.position.set(
        (Math.random()-0.5)*24,
        12,
        (Math.random()-0.5)*24
    );
    food.userData.radius = 0.3;
    scene.add(food);
    foodList.push(food);
}

// ====================== 5. 碰撞检测函数 ======================
function checkCollision(objA, objB, rA, rB){
    return objA.position.distanceTo(objB.position) < rA + rB;
}

// 更新血量UI
function updateHPUI(){
    let str = "";
    for(let i=0;i<3;i++) str += i<hp ? "❤️":"🖤";
    hpDom.innerText = str;
}

// ====================== 6. 重置游戏函数 ======================
function resetGame(){
    // 清理场景内所有石头食物
    rockList.forEach(r=>scene.remove(r));
    foodList.forEach(f=>scene.remove(f));
    rockList.length = 0;
    foodList.length = 0;

    score = 0;
    hp =3;
    dropSpeed = 0.06;
    spawnInterval = 120;
    gameOver = false;
    player.position.set(0,0.6,0);
    scoreDom.innerText = score;
    updateHPUI();
    gameOverDom.style.display = "none";
}

// ====================== 7. 主动画循环（每一帧执行） ======================
const clock = new THREE.Clock();
function animate(){
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if(!gameOver){
        // 玩家平滑移动向鼠标目标点
        player.position.lerp(targetPlayerPos, 0.08);

        // 物体生成计时器
        spawnTimer++;
        if(spawnTimer >= spawnInterval){
            spawnTimer = 0;
            createRock();
            // 35%概率生成食物
            if(Math.random() > 0.65) createFood();

            // 难度递增：缩短生成间隔，加快下落速度（限制上下限防止失控）
            if(spawnInterval>40) spawnInterval -= 0.4;
            if(dropSpeed <0.22) dropSpeed +=0.0008;
        }

        // 更新石头：下落 + 碰撞判断
        for(let i=rockList.length-1;i>=0;i--){
            const rock = rockList[i];
            rock.position.y -= dropSpeed;

            if(checkCollision(player, rock, 0.6, rock.userData.radius)){
                hp--;
                updateHPUI();
                scene.remove(rock);
                rockList.splice(i,1);
                if(hp <= 0){
                    gameOver = true;
                    gameOverDom.style.display = "block";
                }
                continue;
            }
            // 落地销毁
            if(rock.position.y <= rock.userData.radius){
                scene.remove(rock);
                rockList.splice(i,1);
            }
        }

        // 更新食物：下落 + 碰撞判断
        for(let i=foodList.length-1;i>=0;i--){
            const food = foodList[i];
            food.position.y -= dropSpeed;

            if(checkCollision(player, food, 0.6, food.userData.radius)){
                score += 10;
                scoreDom.innerText = score;
                scene.remove(food);
                foodList.splice(i,1);
                continue;
            }
            if(food.position.y <= food.userData.radius){
                scene.remove(food);
                foodList.splice(i,1);
            }
        }
    }

    renderer.render(scene,camera);
}

// 窗口大小自适应
window.addEventListener('resize',()=>{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
})

resetGame();
animate();
