import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
export default defineSchema({
  users: defineTable({ name:v.string(), phone:v.optional(v.string()), voiceProfileId:v.optional(v.string()) }),
  trustedContacts: defineTable({ userId:v.id('users'), name:v.string(), phone:v.string(), relationship:v.string(), verified:v.boolean() }).index('by_user',['userId']),
  transcripts: defineTable({ userId:v.id('users'), text:v.string(), source:v.union(v.literal('voice'),v.literal('text')), createdAt:v.number() }).index('by_user',['userId']),
  scamAnalyses: defineTable({ userId:v.id('users'), transcriptId:v.optional(v.id('transcripts')), content:v.string(), risk:v.union(v.literal('low'),v.literal('medium'),v.literal('high')), score:v.number(), reasons:v.array(v.string()), officialContact:v.optional(v.string()), createdAt:v.number() }).index('by_user',['userId']),
  approvals: defineTable({ analysisId:v.id('scamAnalyses'), approverType:v.union(v.literal('user'),v.literal('trusted_contact')), approverId:v.string(), approved:v.boolean(), createdAt:v.number() }).index('by_analysis',['analysisId']),
  actionReceipts: defineTable({ userId:v.id('users'), analysisId:v.id('scamAnalyses'), action:v.string(), status:v.union(v.literal('assisted'),v.literal('awaiting_user'),v.literal('awaiting_trusted'),v.literal('approved'),v.literal('blocked'),v.literal('completed')), detail:v.string(), createdAt:v.number() }).index('by_user',['userId']).index('by_analysis',['analysisId']),
});
