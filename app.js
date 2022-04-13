const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/user");
const Articles = require("./models/article");
const Comments = require("./models/comment");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./middlewares/auth-middleware");
const Joi = require("joi");
const cors = require("cors");
const path = require("path"); //nodejs 기본 내장 라이브러리, 파일의 경로, 이름, 확장자 등을 알아낼 때 사용
const crypto = require("crypto");
const multer = require("multer");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");
require("dotenv").config();

// const s3 = new AWS.S3({
//   accessKeyId: process.env.ACCESSKEYID,
//   secretAccessKey: process.env.SECRETACCESSKEY,
//   region: process.env.REGION,
// });

let s3 = new AWS.S3();

const storage = multerS3({
  s3: s3,
  bucket: "doremilanbucket",
  contentType: multerS3.AUTO_CONTENT_TYPE,
  acl: "public-read",
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    cb(null, `uploads/${Date.now()}_${file.originalname}`);
  },
});

// const upload = multer({ storage: storage });
const upload = multer({
  storage: storage,
  fileFilter: function (req, file, callback) {
    const ext = path.extname(file.originalname);
    if (
      ext !== ".png" &&
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".PNG" &&
      ext !== ".JPG" &&
      ext !== ".JPEG"
    ) {
      return callback(new Error("이미지 파일만 업로드하세요"));
    }
    callback(null, true);
  },
  limits: {
    fileSize: 1024 * 1024,
  },
});

// const { upload } = require('./upload);

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "./assets/image");
//   },
//   filename(req, file, callback) {
//     let array = file.originalname.split(".");
//     array[0] = array[0] + "_";
//     array[1] = "." + array[1];
//     array.splice(1, 0, Date.now().toString());
//     const result = array.join("");
//     console.log(result);
//     callback(null, result);
//   },
// });

// const token = jwt.sign({ test: true }, "mysecretkey");
// console.log(token);

// const decoded = jwt.decode(
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0Ijp0cnVlLCJpYXQiOjE2NDgzNjgxNjJ9.-snsnrb3_GFfwBi1eM8AQP3fOvMcUd6SFDqDMKzn83w"
// );
// console.log(decoded);

mongoose.connect("mongodb://localhost:27017/project_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));

const app = express();
const router = express.Router();

app.use(cors());

app.get("/cors-test", (req, res) => {
  res.send("hi");
});

// 프로필 이미지 업로드
router.post("/upload", upload.single("profile_image"), async (req, res) => {
  // const userId = res.locals._id;
  const profileImageUrl = req.file.location;
  console.log(profileImageUrl);

  // const user = await User.findOne({ userId });
  // user.profileImageUrl = profileImageUrl;
  // await user.save();

  res.send({});
});
//파일 여러개를 배열로 업로드 할 때. ex) { img: [File,File,File,...] }
// app.post('/uploadArray', upload.array('img'), (req,res) => {
// 	console.log(req.files)
// }
//파일을 여러개의 객체로 업로드 할 때.
// app.post('/uploadFields', upload.fields([ {name:'img1'},{name:'img2'},{name:'img3'}]), (req,res) => {
// 	console.log(req.files)
// }
// 프로필 사진 보여주기
// router.post('/profile_image', async (req, res) => {
//   const userId = res.locals.user[0].userId
//   const user = await User.findOne({ userId })
//   const profileImageUrl = user.profileImageUrl

//   res.json({ profileImageUrl })
// })

//회원가입
const postUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(4).required(),
  confirmPassword: Joi.string().required(),
});

router.post("/users", async (req, res) => {
  try {
    const { email, password, confirmPassword } =
      await postUserSchema.validateAsync(req.body);
    if (password !== confirmPassword) {
      res.status(400).send({
        errorMessage: "패스워드가 패스워드 확인란과 다릅니다.",
      });
      return;
    } else if (password.includes(email)) {
      res.status(400).send({
        errorMessage: "이메일과 동일한 비밀번호는 사용할 수 없습니다.",
      });
      return;
    }

    const [existsUsers] = await User.find({ email: email });
    if (existsUsers) {
      res.status(400).send({
        errorMessage: "이미 사용중인 이메일입니다.",
      });
      return;
    }

    const salt = crypto.randomBytes(64).toString("base64");
    const hashedPw = crypto
      .pbkdf2Sync(password, salt, 104906, 64, "sha512")
      .toString("base64");
    console.log(`salt : ${salt} , hashedPW: ${hashedPw}`);

    // const hashedPassword = password => {
    //   crypto.randomBytes(64, (err, buf) => {
    //     const salt = buf.toString('base64')
    //     crypto.pbkdf2(password, salt, 104906, 64, 'sha512', (err, key) =>{
    //       console.log(key.toString('base64'))
    //     })
    //   })
    // }
    // hashedPassword(password)

    // const createHashedPassword = crypto
    //   .createHash("sha512")
    //   .update(password)
    //   .digest("base64");
    // //createHash(): 사용할 알고리즘, update(): 암호화할 비밀번호, desest(): 인코딩 방식
    // console.log(createHashedPassword);
    const user = new User({ email, password, salt });
    user.password = hashedPw;
    await user.save();

    res.status(201).send({
      msg: "가입 완료!",
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      errorMessage: "요청한 데이터 형식이 올바르지 않습니다.",
    });
  }
});

//로그인
router.post("/auth", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  userSalt = user.salt;
  const hashedPw = crypto
    .pbkdf2Sync(password, userSalt, 104906, 64, "sha512")
    .toString("base64");
  console.log(userSalt, hashedPw);

  // const createHashedPassword = crypto
  //   .createHash("sha512")
  //   .update(password)
  //   .digest("base64");

  // const user = await User.findOne({
  //   $and: [{ email: email }, { password: createHashedPassword }],
  // });

  if (!user || hashedPw !== user.password) {
    res.status(400).send({
      errorMessage: "이메일 또는 패스워드가 틀렸습니다.",
    });
    return;
  }

  const token = jwt.sign({ userId: user.userId }, "mysecretkey");

  res.send({
    token,
  });
});

//사용자 정보조회
router.get("/users/me", authMiddleware, async (req, res) => {
  // console.log(res.locals);
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

  const createdAtricle = await Articles.create({
    writer,
    title,
    password,
    content,
    date,
  });

  res.json({
    msg: "등록 완료!",
  });
});

// //파일 업로드
// app.post("/upload", upload.single("image"), (req, res) => {
//   console.log(req.file);

//   res.json({
//     msg: "전송 완료!",
//   });
// });

// 상세 정보를 조회합니다.
router.get("/detail/:_id", async (req, res) => {
  const { _id } = req.params;
  const [detail] = await Articles.find({ _id: _id });

  res.json({
    detail,
  });
});

// 수정하기 정보를 반환합니다.
router.get("/edit/:_id", authMiddleware, async (req, res) => {
  const { _id } = req.params;
  const [edit_detail] = await Articles.find({ _id: _id });

  res.json({
    edit_detail,
  });
});

//게시글을 수정합니다.
router.put("/edit/:_id", authMiddleware, async (req, res) => {
  const { _id } = req.params;
  const { writer, title, password, content } = req.body;

  const existArticle = await Articles.find({
    _id: _id,
    password: Number(password),
  });

  if (existArticle.length) {
    await Articles.updateOne(
      { _id: _id },
      { $set: { writer, title, content } }
    );
  } else {
    return res.status(400).json({
      success: false,
      msg: "비밀번호가 일치하지 않습니다!",
    });
  }

  res.json({
    success: true,
    msg: "수정 완료!",
  });
});

//게시글을 삭제합니다.
router.delete("/edit/:_id", authMiddleware, async (req, res) => {
  const { _id } = req.params;
  const { password } = req.body;

  const existArticle = await Articles.find({
    _id: _id,
    password: Number(password),
  });
  const existComment = await Comments.find({ postId: _id });

  if (existArticle.length > 0) {
    await Articles.deleteOne({ _id });
    await Comments.deleteMany({ postId: _id });
  } else {
    return res.status(400).json({
      success: false,
      msg: "비밀번호가 일치하지 않습니다!",
    });
  }

  res.json({
    success: true,
    msg: "삭제 완료!",
  });
});

//댓글을 저장합니다.
router.post("/comments/:_id", authMiddleware, async (req, res) => {
  const { comment } = req.body;
  const postId = req.params._id;
  const userId = res.locals._id;
  console.log(userId);

  const createdComment = await Comments.create({ comment, postId, userId });

  res.json({
    msg: "등록 완료!",
  });
});

//댓글 목록 조회
router.get("/comments/:_id", async (req, res) => {
  const postId = req.params._id;
  console.log(postId);
  const comments = await Comments.find({ postId: postId });

  res.json({
    comments,
  });
});

//댓글을 수정합니다.
router.put("/editComment", authMiddleware, async (req, res) => {
  const { comment, commentId } = req.body;
  console.log(comment, commentId);

  const existComment = await Comments.find({ commentId });

  if (existComment.length) {
    await Comments.updateOne({ _id: commentId }, { $set: { comment } });
  } else {
    return res.status(400).json({
      success: false,
      msg: "비밀번호가 일치하지 않습니다!",
    });
  }

  res.json({
    success: true,
    msg: "수정 완료!",
  });
});

//댓글을 삭제합니다.
router.delete("/deleteComment", authMiddleware, async (req, res) => {
  const { commentId } = req.body;
  console.log(commentId);

  const existComment = await Comments.find({ _id: commentId });
  console.log(existComment);

  if (existComment.length > 0) {
    await Comments.deleteOne({ _id: commentId });
  } else {
    return res.status(400).json({
      success: false,
      msg: "비밀번호가 일치하지 않습니다!",
    });
  }

  res.json({
    success: true,
    msg: "삭제 완료!",
  });
});

// 좋아요
router.patch("/likes/add/:_id", authMiddleware, async (req, res) => {
  const { _id } = req.params;
  const userId = res.locals.user._id;
  console.log(userId);

  const [likedArticle] = await Articles.find({ _id: _id });
  console.log(likedArticle);

  const like_users = likedArticle["like_users"];
  console.log(like_users);
  console.log(userId);

  if (like_users.includes(userId)) {
    await Articles.updateOne(
      { _id: _id },
      {
        $inc: { totalLike: -1 },
        $pull: { like_users: userId },
      }
    );
  } else {
    await Articles.updateOne(
      { _id: _id },
      {
        $inc: { totalLike: 1 },
        $push: { like_users: userId },
      }
    );
  }
  res.json({
    success: true,
  });
});

app.use(express.static("assets"));
app.use(express.json());
app.use("/api", express.urlencoded({ extended: false }), router);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/assets/list.html");
});

app.get("/write", (req, res) => {
  res.sendFile(__dirname + "/assets/write.html");
});

app.get("/detail", (req, res) => {
  res.sendFile(__dirname + "/assets/detail.html");
});

app.get("/edit", (req, res) => {
  res.sendFile(__dirname + "/assets/edit.html");
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/assets/login.html");
});

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/assets/register.html");
});

app.get("/upload", (req, res) => {
  res.sendFile(__dirname + "/assets/upload.html");
});

app.listen(3000, () => {
  console.log("Server is listening...");
});
