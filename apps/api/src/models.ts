import mongoose from 'mongoose';
const {Schema,model}=mongoose;
export const User=model('User',new Schema({email:{type:String,unique:true,index:true},password:String,name:String},{timestamps:true}));
const documentSchema=new Schema({owner:{type:Schema.Types.ObjectId,ref:'User',index:true},name:String,path:String,hash:String,size:Number,status:{type:String,default:'queued'},error:String},{timestamps:true});
documentSchema.index({owner:1,hash:1},{unique:true});
export const Document=model('Document',documentSchema);
// Keep uploaded bytes separate from document metadata. Production uses this
// collection because free cloud instances do not provide durable local disks.
export const DocumentFile=model('DocumentFile',new Schema({owner:{type:Schema.Types.ObjectId,index:true},document:{type:Schema.Types.ObjectId,unique:true,index:true},data:{type:Buffer,required:true}},{timestamps:true}));
export const Chunk=model('Chunk',new Schema({owner:{type:Schema.Types.ObjectId,index:true},document:{type:Schema.Types.ObjectId,index:true},page:Number,text:String,embedding:[Number]}));
export const Conversation=model('Conversation',new Schema({owner:{type:Schema.Types.ObjectId,index:true},title:String,messages:[{role:String,content:String,citations:[{document:String,name:String,page:Number,number:Number,kind:String}]}]},{timestamps:true}));
export const Session=model('Session',new Schema({owner:{type:Schema.Types.ObjectId,index:true},tokenHash:{type:String,unique:true},expiresAt:{type:Date,index:{expires:0}}},{timestamps:true}));
export const Collection=model('Collection',new Schema({owner:{type:Schema.Types.ObjectId,index:true},name:{type:String,required:true,maxlength:80},documents:[{type:Schema.Types.ObjectId,ref:'Document'}]},{timestamps:true}));
export const Quiz=model('Quiz',new Schema({owner:{type:Schema.Types.ObjectId,index:true},document:{type:Schema.Types.ObjectId,index:true},questions:[{question:String,options:[String],answer:Number,explanation:String}],omittedQuestions:Number,sources:[{page:Number}]},{timestamps:true}));
export const StudySet=model('StudySet',new Schema({owner:{type:Schema.Types.ObjectId,index:true},document:{type:Schema.Types.ObjectId,index:true},kind:{type:String,enum:['summary','flashcards'],required:true},summary:String,omittedCards:Number,cards:[{front:String,back:String}],sources:[{page:Number,number:Number}]},{timestamps:true}));
