const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/user");
const Articles = require("./models/article");
const Comments = require("./models/comment");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middlewares/auth-middleware");
const user = require("./models/user");

// const token = jwt.sign({ test: true }, "mysecretkey");
// console.log(token);

// const decoded = jwt.decode("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0Ijp0cnVlLCJpYXQiOjE2NDgzNjgxNjJ9.-snsnrb3_GFfwBi1eM8AQP3fOvMcUd6SFDqDMKzn83w"); 
// console.log(decoded)


mongoose.connect("mongodb://localhost:27017/project_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));

const app = express();
const router = express.Router();


router.post("/users", async (req, res) => {
    const { nickname, password, confirmPassword } = req.body;
  
    if (password !== confirmPassword) {
      res.status(400).send({
        errorMessage: "패스워드가 패스워드 확인란과 다릅니다.",
      });
      return;
    }
  
    const [existsUsers] = await User.find({ nickname: nickname });

    if (existsUsers) {

      res.status(400).send({
        errorMessage: "이미 사용중인 닉네임입니다.",
      });
      return;
    }
  
    const user = new User({ nickname, password });
    await user.save();
  
    res.status(201).send({
        msg : "가입 완료!" 
    });
  });


router.post("/auth", async (req, res) => {
    const { nickname, password } = req.body;
  
    const user = await User.findOne({ nickname });
  
    if (!user || password !== user.password) {
      res.status(400).send({
        errorMessage: "닉네임 또는 패스워드가 틀렸습니다.",
      });
      return;
    }
    
    const token = jwt.sign({ userId: user.userId }, "mysecretkey");
    
      res.send({
        token,
      });
  });    


  router.get("/users/me", authMiddleware, async (req, res) => {
      console.log(res.locals);  
      const { user } = res.locals;
        res.send({
            user,
        });
  });

  //게시글 목록 조회
  router.get("/articles", async (req, res) => { 

    const articles = await Articles.find();
    
    res.json({
        articles,
    });
});


  //작성한 게시글을 저장합니다.
  router.post("/articles", authMiddleware, async (req, res) => { 
    let today = new Date();
    let date = today.toLocaleDateString();

    const { writer, title, password, content } = req.body;
    console.log({ writer, title, password, content });

    const createdAtricle = await Articles.create({ writer, title, password, content, date });

    res.json({ 
        msg : "등록 완료!" 
    });
});


  // 상세 정보를 조회합니다.
  router.get("/detail/:_id", async (req, res) => { 
    const { _id } = req.params;
    const [detail] = await Articles.find({ _id: _id })

    res.json({
        detail,
    });
});


    // 수정하기 정보를 반환합니다.
    router.get("/edit/:_id", authMiddleware, async (req, res) => { 
        const { _id } = req.params;
        const [edit_detail] = await Articles.find({ _id: _id })
    
        res.json({
            edit_detail,
        });
    });


    //게시글을 수정합니다.
    router.put("/edit/:_id", authMiddleware, async (req, res) => { 
        const { _id } = req.params;
        const { writer, title, password, content } = req.body;   
        
        const existArticle = await Articles.find({ _id: _id, password: Number(password) });  

        if (existArticle.length) {
            await Articles.updateOne({ _id: _id }, { $set: { writer, title, content } });
        } else {
            return res.status(400).json({ 
                success: false, msg: "비밀번호가 일치하지 않습니다!" 
            });
        }

        res.json({ 
            success: true, msg: "수정 완료!" 
        });
    });


    //게시글을 삭제합니다.
    router.delete("/edit/:_id", authMiddleware, async (req, res) => {
        const { _id } = req.params;
        const { password } = req.body;
    
        const existArticle = await Articles.find({ _id: _id, password: Number(password) });

        if (existArticle.length > 0) {
            await Articles.deleteOne({ _id });
        } else {
            return res.status(400).json({ 
                success: false, msg: "비밀번호가 일치하지 않습니다!" 
            });
        }
        
        res.json({ 
            success: true, msg: "삭제 완료!" 
        });
    });


  //댓글을 저장합니다.
  router.post("/comments/:_id", authMiddleware, async (req, res) => { 
    const { comment } = req.body;
    const postId = req.params._id;
    const userId = res.locals.user._id;

    const createdComment = await Comments.create({ comment, postId, userId });

    res.json({ 
        msg : "등록 완료!" 
    });
});


  //댓글 목록 조회 (프론트에서 받아온 토큰으로.. 유저id를 찾아서 보내고 싶음 ㅠㅠ )
  router.get("/comments/:postId", async (req, res) => { 
    const { postId } = req.params;

    const comments = await Comments.find({ postId: postId }); 
    
    res.json({
        comments,
    });
});




app.use("/api", express.urlencoded({ extended: false }), router);
app.use(express.static("assets"));
app.use(express.json());


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/assets/list.html')
}); 

app.get('/write', (req, res) => {
  res.sendFile(__dirname + '/assets/write.html')
});

app.get('/detail', (req, res) => {
  res.sendFile(__dirname + '/assets/detail.html')
});

app.get('/edit', (req, res) => {
  res.sendFile(__dirname + '/assets/edit.html')
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/assets/login.html')
  });

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/assets/register.html')
});  


app.listen(8000, () => {
  console.log("Server is listening...");
});