import {expect,it} from 'vitest';
import {quickReply,isFollowUp,formatFollowUpAnswer} from './chatReplies.js';

it('answers a greeting without treating it as a document question',()=>{
 expect(quickReply('hii')).toMatch(/Hi! I’m DocShelf/);
 expect(quickReply('HELLO!')).toMatch(/Hi! I’m DocShelf/);
 expect(quickReply('Hi, what is the launch date?')).toBeNull();
 expect(quickReply('What is the launch date?')).toBeNull();
});

it('recognizes formatting follow-ups without classifying a new topic as one',()=>{
 expect(isFollowUp('Tell me in points')).toBe(true);
 expect(isFollowUp('Summarize that')).toBe(true);
 expect(isFollowUp('What are the prompts about?')).toBe(false);
 expect(formatFollowUpAnswer('[1] Maya Patel is the release owner.','Tell me in points')).toBe('- [1] Maya Patel is the release owner.');
});
