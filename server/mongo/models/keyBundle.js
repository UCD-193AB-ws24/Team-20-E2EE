import mongoose from 'mongoose';

const keyBundleSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  registrationId: {
    type: Number,
    required: true
  },
  identityPubKey: {
    type: Object,
    required: true
  },
  signedPreKeyId: {
    type: Number,
    required: true
  },
  signedPreKeyPub: {
    type: Object,
    required: true
  },
  signedPreKeySignature: {
    type: String,
    required: true
  },
  preKeys: [{
    keyId: Number,
    pubKey: Object
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('KeyBundle', keyBundleSchema);