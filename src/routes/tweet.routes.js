import express from "express";
import { verifyJwt } from "../middlewares/auth.middleware";
import { createTweet, deleteTweet, getUserTweets, updateTweet } from "../controllers/tweet.controller";

router.use(verifyJwt)

router.route("/create").post(createTweet)
router.route("/user/tweet").get(getUserTweets)
router.route("/user/update").patch(updateTweet).delete(deleteTweet)
export default router
