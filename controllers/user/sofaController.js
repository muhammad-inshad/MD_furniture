const sofaTemp=async(req,res)=>{
    try {
        res.render("chair",{isLogin:true})
    } catch (error) {
        
    }
}


module.exports={
      sofaTemp
}