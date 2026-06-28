import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  standupYesterday: { type: String, default: '' },
  standupToday: { type: String, default: '' },
  standupBlockers: { type: String, default: '' },
  standupDate: { type: String, default: '' }
}, {
  timestamps: { createdAt: 'created', updatedAt: 'updated' }
});

userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

const User = mongoose.model('User', userSchema);
export default User;
