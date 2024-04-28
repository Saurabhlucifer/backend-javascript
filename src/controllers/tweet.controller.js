import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content}= req.body
    if(!content || content?.trim()==="")
    throw new ApiError(404,"Content of tweet is required")
      const user= await User.findById(req.body._id)
      if(!user)
      throw new ApiError(404,"User not found")
    const tweet=await Tweet.create({
        content,
        owner: user._id
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {
                tweet
            },
            "Tweet created successfully"
        )
    )
    
})

const getUserTweets = asyncHandler(async (req, res) => {
    
    const {userId} = req.params
    const user=await User.findById(userId)
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user?._id)
            }

        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner details",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avater: 1,
                            fullname: 1,
                            content: 1
                        }
                    }

                ]
            }
        }
    ])
    return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"))
    
})

const updateTweet = asyncHandler(async (req, res) => {
    
    const{tweetId} = req.params
    const {content} = req.body
    if(!content)
    throw new ApiError(400,"Content is required")
    if(!isValidObjectId(tweetId))
    throw new ApiError(400,"Invalid Id")
    const tweet= await Tweet.findById(tweetId)
    if(!tweet)
    throw new ApiError(404,"Tweet not found")
    if(tweet?.owner.toString()!==req.user?._id)
    throw new ApiError(400,"Owner only is authorised to edit tweets")
    
    const newTweet= await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content
            }
        },
        {new : true}
    )

    if(!newTweet)
    throw new ApiError(400,"Failed to update tweet. Please Try Again")


    return res.status(200)
    .json(new ApiResponse(200,newTweet,"Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    
    const {tweetId}=req.params
    if(!isValidObjectId(tweetId))
    throw new ApiError(404,"Imvalid id")
    
    const tweet=await Tweet.findById(tweetId)
    if(!tweet)
    throw new ApiError(404,"Tweet not found")

if(tweet?.owner.toString()!==req.user?._id.toString())
throw new ApiError(400,"Not Auhtorised to delete this tweet")

await Tweet.findByIdAndDelete(tweetId)
return res
       .status(200)
       .json( new ApiResponse(200,{tweetId},"Tweet deleted successfully"))
   
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}