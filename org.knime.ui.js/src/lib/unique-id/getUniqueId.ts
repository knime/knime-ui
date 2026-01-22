// eslint-disable-next-line func-style
function* generator(): Iterator<number> {
  let id = -1;
  while (true) {
    id++;
    yield id;
  }
}

const idGen = generator();

export const getSequentialId = () => idGen.next().value.toString();
