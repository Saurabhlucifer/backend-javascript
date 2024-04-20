import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { jwt } from "jsonwebtoken"




const generateAccessandRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken ()    
        
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken,refreshToken}
        


    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
   // get user details from frontend
   // validation - not empty
   // check if user already exists: username and email
   // check for images,check for avatar
   // upload them to cloudinary, avatar
   // create user object - create entry in db
   // remove password and refresh token field from response
   // check for user creation
   // return response


const{fullname, email, username, password}=req.body
console.log("email: ", email);
if(
    [fullname, email, username, password].some((field)=> 
    field?.trim()==="")
) {
    throw new ApiError(400, "All fields are required")
}

const existedUser = await User.findOne({
    $or:[{ username } ,{ email }]
})
if(existedUser)
throw new ApiError(409, "User wtih username or email already exists")

const avatarLocalPath = req.files?.avatar[0]?.path
//const userImageLocalPath = req.files?.coverimage[0]?.path

let userImageLocalPath
if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length>0)
{
    userImageLocalPath=req.files?.coverimage[0]?.path
}

if(!avatarLocalPath)
throw new ApiError(400, "Avatar file is required")


const avatar = await uploadOnCloudinary(avatarLocalPath)
const coverimage = await uploadOnCloudinary(userImageLocalPath)

if(!avatar)
throw new ApiError(400,"Avatar file is required")

const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
    email,
    password,
    username: username.toLowerCase()
})

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if(!createdUser)
throw new ApiError(500, "Something went wrong while registering the user")



return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered Successfully")
)



})

const loginUser = asyncHandler(async(req,res)=>{
          // rq body-> data
          // username or email
          // find the user
          // password check
          //access and refresh token 
          //send cookies 
          const {email, username, password} = req.body
        
          if(!username && !email)
          throw new ApiError(400,'username or email is required')
          

    
       const user = await User.findOne({
        $or: [{username},{email}]
       })   
       if(!user)
       throw new ApiError(404,"user does not exist")

       const isPasswordValid = await user.isPasswordCorrect(password)

       if(!isPasswordValid)
       throw new ApiError(401,"Password Incorrect")

         const {accessToken,refreshToken} = await generateAccessandRefreshTokens(user._id)


        const loggedInUser=await User.findById(user._id).select(
                 "-password -refreshToken"
        )

        const options = { 
            httpOnly: true,
            secure: true
        }

        return res
        .status(200).cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
        "User logged in successfully"
    )
        )

})


const logoutUser = asyncHandler(async(req,res)=>{
       
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        )
        const options = {
            httpOnly: true,
            secure: true
        }
        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"USer logged out"))


})
        

const refreshAccessToken = asyncHandler(async(req,res)=>{

    const incomingRefreshToken=req.cookies.
    refreshToken || req.body.refreshToken
  
    if(incomingRefreshToken)
      throw new ApiError(401,"Unautjorized request")

   
       try {
         const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOEKN_SECRET)
     
         const user =  await User.findById(decodedToken?._id)
         
         if(!user)
         throw new ApiError(401,"Invalid refresh token")
 
 if(!incomingRefreshToken !== user?.refreshToken ){
     throw new ApiError(401,"Refresh token expired")
 }
    const options = {
     httpOnly: true,
     secure: true
    }
    const{accessToken,newrefreshToken}=await generateAccessandRefreshTokens(user._id)
 
    return res.
    status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newrefreshToken,options)
    .json(
     new ApiResponse(
         200,
         {accessToken,refreshToken: newrefreshToken},
         "Access Token Refreshed"
     )
    )
       } catch (error) {
          throw new ApiError(401,error?.message || "Invalid refresh Token")
       }


})

const changeCurrentPassword = asyncHandler(async(req,res)=>{

    const {oldPassword , newPassword} = req.body


    const user = await User.findById(req.user?._id)
    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect)
    throw new ApiError(400,"Invalid Password")
   user.password=newPassword
   await user.save({validateBeforeSave: false})
   return res.status(200)
   .json(new ApiResponse(200,{},"Password Changed Successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"Current User fetched successfully"))
})
const updateAccountDetails = asyncHandler(async(req,res)=>{
    const{fullname,email}=req.body


    if(!fullname || !email)
    throw new ApiError(400,"All fields are required")
 
      const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"Account Details Updated Succesfully"))


})

const updateUserAvatar = asyncHandler(async(req,res)=>{

   const avatarLocalPath=req.file?.path

   if(!avatarLocalPath)
   throw new ApiError(400,"Avatar is missing")

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   if(!avatar.url)
   throw new ApiError(400,"Error while uploading avatar")

  const user=await User.findOneAndUpdate(
    req.user?._id,
    {
        $set: {
            avatar: avatar.url
        }
    },
    {new: true}
   ).select("-password")
   return res.status(200)
   .json(
       new ApiResponse(200,user,"Avatar updated successfully")
   )


})
const updateUserCoverImage = asyncHandler(async(req,res)=>{

    const coverImageLocalPath=req.file?.path
 
    if(!coverImageLocalPath)
    throw new ApiError(400,"Cover Image is missing")
 
    const coverimage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverimage.url)
    throw new ApiError(400,"Error while uploading coverimage")
 
    const user = await User.findOneAndUpdate(
     req.user?._id,
     {
         $set: {
             coverimage: coverImageLocalPath
         }
     },
     {new: true}
    ).select("-password")
    return res.status(200)
    .json(
        new ApiResponse(200,user,"Cover Image updated successfully")
    )
 
 })

 const getUserChannelProfile = asyncHandler(async(req,res)=>{ 

    const {username}=req.params
    if(!username?.trim())
    throw new ApiError(400,"Username not found")
    //User.find({username})
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverimage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length)
    throw new ApiError(404,"channel does not exist")
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0],"User channel fetched successfully")
    )
 })

 const getWatchHistory = asyncHandler(async(req,res)=>{

    const user = await User.aggregate([

        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchhistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

  return res
  .status(200)
  .json(
    new ApiResponse(200,
    user[0].watchhistory,
    "Watch History fetched successfully")
  )
})
   
 

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile  ,
    getWatchHistory

}