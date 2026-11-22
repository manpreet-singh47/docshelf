/** Small conversational prompts do not need document retrieval or a model call. */
export function quickReply(question:string):string|null{
 const text=question.trim().replace(/[.!?]+$/,'').trim().toLowerCase();
 if(/^(?:hi+|hello+|hey+|hiya|howdy|good morning|good afternoon|good evening)(?: there)?$/.test(text))
  return 'Hi! I’m DocShelf. Ask me a question about your ready documents, or upload one to get started. I’ll show sources when I use your documents.';
 if(/^(?:thanks|thank you|thank you very much)$/.test(text))
  return 'You’re welcome! Ask another question whenever you’re ready.';
 return null;
}

export const noDocumentsReply='Upload a document first, then ask me a question about it. I can read PDF, Word, text, and Markdown files.';
export const noMatchReply='I couldn’t find relevant information in your ready documents. Try a more specific question or upload a relevant document.';

/** Formatting requests need the previous topic to retrieve the right excerpts. */
export function isFollowUp(question:string){
 const text=question.trim().toLowerCase().replace(/[.!?]+$/,'');
 return /^(?:tell me (?:in|as) (?:bullet )?points|put (?:it|that|the answer) (?:in|as) (?:bullet )?points|(?:list|summarize|explain|rephrase) (?:that|it|the answer)|(?:make|write) (?:it|that|the answer) (?:shorter|simpler|as (?:bullet )?points))$/.test(text);
}

export function formatFollowUpAnswer(answer:string,question:string){
 if(!isFollowUp(question)||!/\bpoints\b/i.test(question))return answer;
 const lines=answer.trim().split(/\n+/).map(line=>line.trim()).filter(Boolean);
 if(lines.every(line=>/^(?:[-*•]|\d+[.)])\s/.test(line)))return lines.join('\n');
 const points=lines.flatMap(line=>line.split(/(?<=[.!?])\s+(?=[A-Z])/)).map(line=>line.trim()).filter(Boolean);
 return points.map(line=>/^(?:[-*•]|\d+[.)])\s/.test(line)?line:`- ${line}`).join('\n');
}
