export function softDeletePlugin(schema) {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  });

  // Pre-find middleware to filter out deleted records
  const filterDeleted = function(next) {
    // If explicitly searching for deleted records, don't filter
    if (this.getQuery().includeDeleted === true) {
      delete this.getQuery().includeDeleted;
      return next();
    }
    
    this.where({ isDeleted: false });
    next();
  };

  schema.pre("find", filterDeleted);
  schema.pre("findOne", filterDeleted);
  schema.pre("findOneAndUpdate", filterDeleted);
  schema.pre("countDocuments", filterDeleted);

  // Add a softDelete method to the document
  schema.methods.softDelete = async function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };
}
