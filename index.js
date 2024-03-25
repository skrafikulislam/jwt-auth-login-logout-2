import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
// import cookieParser from "cookie-parser";

const app = express();

dotenv.config();
app.use(express.json());
// app.use(cookieParser());

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
  })
);

const users = [
  {
    id: "1",
    username: "babu",
    password: "babu123",
    isAdmin: true,
  },
  {
    id: "2",
    username: "rafikul",
    password: "rafikul987",
    isAdmin: false,
  },
];
// Creating Array to Add Refresh Tokens
let refreshTokens = [];
// Generating Access And Refresh Token from Refresh Token Itself to delete the user
app.post("/api/refresh", (req, res) => {
  const refreshToken = req.body.token;

  if (!refreshToken) {
    return res.status(401).json("You are not authenticated");
  }

  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json("Refresh Token is not Valid");
  }

  jwt.verify(refreshToken, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      console.log(err);
    }

    refreshTokens = refreshTokens.filter((token) => token !== refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    refreshTokens.push(newRefreshToken);

    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  });
});

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, isAdmin: user.isAdmin }, process.env.SECRET, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, isAdmin: user.isAdmin },
    process.env.SECRET_KEY
  );
};

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => {
    return u.username === username && u.password === password;
  });

  if (user) {
    //  Generate Json Web Token = accessToken
    const accessToken = generateAccessToken(user);
    // Generate Refresh Token
    const refreshToken = generateRefreshToken(user);
    // Adding Refresh Token Into The Empty Array
    refreshTokens.push(refreshToken);

    res.json({
      username: user.username,
      isAdmin: user.isAdmin,
      accessToken,
      refreshToken,
    });
  } else {
    res.status(400).json("username or password is Invalid");
  }
});

// Auth Jwt MiddleWare
const verify = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // const token = authHeader.split(" ")[1]; // For this line of code to execute you need to add "Bearer" word infront of the access token in the header part with a single gap/space.
    const token = authHeader;

    // Verify the accessToken
    jwt.verify(token, process.env.SECRET, (err, user) => {
      if (err) {
        return res.status(403).json("Token is Invalid");
      }
      //! The Below Line of Code Is Mysterious to me need to understand ASAP. Why below code needed.
      req.user = user;
      next();
    });
  } else {
    res.status(401).json("You are not authorized");
  }
};

// To delete user using access token
app.delete("/api/users/:userId", verify, (req, res) => {
  if (req.user.id === req.params.userId || req.user.isAdmin) {
    res.status(200).json("User Has Been Deleted");
  } else {
    res.status(403).json("You are not allowed to delete this user ");
  }
});

app.post("/api/logout", verify, (req, res) => {
  const refreshToken = req.body.token;
  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
  res.status(200).jaon("You Logged Out Successfully");
});

app.listen(process.env.PORT, () => {
  console.log(`Server is Running on Port ${process.env.PORT}`);
});
